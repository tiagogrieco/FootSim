/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { MatchResult } from "../engine/matchEngine";
import type { ManagerProfile, DailyChallenge, NewsItem, UnlockedAchievement } from "../types/meta";
import { generateGeminiMatchNews } from "../engine/geminiEngine";
import { EMPTY_PROFILE } from "../types/meta";
import type { AchievementDef } from "../data/achievements";
import {
  applyMatchToProfile,
  evaluateChallengesAfterMatch,
  evaluateNewAchievements,
  newsFromMatch,
  newsForLevelUp,
  newsForAchievement,
  rollDailyChallenges,
  levelFromXP,
  XP_REWARDS,
  adjustManagerReputation,
} from "../engine/metaEngine";

const STORAGE_KEY = "footsim_meta_v1";

interface MetaState {
  profile: ManagerProfile;
  unlocked: UnlockedAchievement[];
  news: NewsItem[];
  challengeDate: string | null;
  challenges: DailyChallenge[];
}

const EMPTY_STATE: MetaState = {
  profile: EMPTY_PROFILE,
  unlocked: [],
  news: [],
  challengeDate: null,
  challenges: [],
};

function loadState(): MetaState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<MetaState>;
    return {
      profile: { ...EMPTY_PROFILE, ...(parsed.profile ?? {}) },
      unlocked: parsed.unlocked ?? [],
      news: (parsed.news ?? []).slice(-200),
      challengeDate: parsed.challengeDate ?? null,
      challenges: parsed.challenges ?? [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

function persist(state: MetaState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota or private mode */ }
}

interface MetaContextType {
  profile: ManagerProfile;
  unlocked: UnlockedAchievement[];
  news: NewsItem[];
  challenges: DailyChallenge[];
  unreadNewsCount: number;
  toastQueue: AchievementDef[];

  trackMatch: (match: MatchResult, playerClubId: number) => void;
  trackTrophy: () => void;
  trackBestPosition: (position: number) => void;
  syncChallengesForDate: (dateKey: string) => void;
  dismissToast: () => void;
  markNewsRead: (id: string) => void;
  markAllNewsRead: () => void;
  resetMeta: () => void;
}

const MetaContext = createContext<MetaContextType | null>(null);
export function useMeta() {
  const ctx = useContext(MetaContext);
  if (!ctx) throw new Error("useMeta must be inside MetaProvider");
  return ctx;
}

export function MetaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MetaState>(() => loadState());
  const [toastQueue, setToastQueue] = useState<AchievementDef[]>([]);
  const stateRef = useRef(state);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { persist(state); }, [state]);

  const checkAchievementsAndQueue = useCallback((profile: ManagerProfile, unlocked: UnlockedAchievement[], date: string) => {
    const set = new Set(unlocked.map(u => u.id));
    const fresh = evaluateNewAchievements(profile, set);
    if (fresh.length === 0) return { unlocked, profile, news: [] as NewsItem[] };
    let xpBonus = 0;
    const news: NewsItem[] = [];
    const nextUnlocked: UnlockedAchievement[] = [...unlocked];
    for (const a of fresh) {
      xpBonus += a.xp;
      nextUnlocked.push({ id: a.id, unlockedAt: new Date().toISOString() });
      news.push(newsForAchievement(a.name, a.icon, date));
    }
    setToastQueue(q => [...q, ...fresh]);
    return {
      unlocked: nextUnlocked,
      profile: { ...profile, xp: profile.xp + xpBonus },
      news,
    };
  }, []);

  const trackMatch = useCallback((match: MatchResult, playerClubId: number) => {
    const date = new Date().toISOString().split("T")[0];

    // AI News Generation
    const useAiNews = localStorage.getItem("footsim_use_ai_news") !== "false";
    const apiKey = localStorage.getItem("footsim_gemini_api_key");

    if (useAiNews && apiKey) {
      const isHome = match.homeClub.id === playerClubId;
      const me = isHome ? match.homeClub : match.awayClub;
      const opp = isHome ? match.awayClub : match.homeClub;
      const my = isHome ? match.homeGoals : match.awayGoals;
      const op = isHome ? match.awayGoals : match.homeGoals;

      const goals = match.events
        .filter(e => e.type === "goal")
        .map(e => ({
          minute: e.minute,
          scorer: e.playerName || "Jogador",
          clubId: e.team === "home" ? match.homeClub.id : match.awayClub.id
        }));

      generateGeminiMatchNews(
        me.name,
        opp.name,
        `${my}×${op}`,
        {
          homeShots: match.shots.home,
          awayShots: match.shots.away,
          homePossession: match.possession.home,
          awayPossession: match.possession.away,
          homeFouls: match.fouls.home,
          awayFouls: match.fouls.away
        },
        goals
      ).then(newsData => {
        if (newsData) {
          setState(prev => {
            const aiNewsItem: NewsItem = {
              id: `ai-news-${Date.now()}`,
              date,
              read: false,
              tone: my > op ? "good" : my < op ? "bad" : "neutral",
              icon: "📰",
              headline: newsData.title,
              body: newsData.content
            };
            // Replace static match news (which starts with 'm-') that we just added
            return {
              ...prev,
              news: [...prev.news.filter(n => !n.id.startsWith("m-")), aiNewsItem].slice(-200)
            };
          });
        }
      }).catch(err => {
        console.error("Erro ao gerar notícia com Gemini:", err);
      });
    }

    setState(prev => {
      // 1. Profile delta
      const delta = applyMatchToProfile(prev.profile, match, playerClubId);
      let profile = delta.profile;
      const prevLevel = prev.profile.level;
      const newLevel = profile.level;

      // 2. Challenges
      const { challenges: nextChallenges, newlyCompleted } = evaluateChallengesAfterMatch(
        prev.challenges, match, playerClubId,
      );
      let challengeXP = 0;
      const challengeNews: NewsItem[] = [];
      for (const c of newlyCompleted) {
        challengeXP += c.xpReward;
        challengeNews.push({
          id: `chnews-${c.id}`, date, read: false, tone: "good", icon: "🎯",
          headline: `Desafio diário completo: ${c.description} (+${c.xpReward} XP)`,
        });
      }
      profile = {
        ...profile,
        xp: profile.xp + challengeXP,
        challengesCompleted: profile.challengesCompleted + newlyCompleted.length,
      };
      profile = { ...profile, level: Math.max(profile.level, newLevel) };
      // recompute level after challenge XP
      profile = { ...profile, level: levelFromXP(profile.xp) };

      // 3. Match news
      const matchNews = newsFromMatch(match, playerClubId, date);

      // 4. Level-up news
      const levelNews: NewsItem[] = [];
      if (profile.level > prevLevel) {
        levelNews.push(newsForLevelUp(profile.level, date));
      }

      // 5. Achievements
      const { unlocked: nextUnlocked, profile: bumpedProfile, news: achNews } =
        checkAchievementsAndQueue(profile, prev.unlocked, date);

      return {
        ...prev,
        profile: bumpedProfile,
        unlocked: nextUnlocked,
        challenges: nextChallenges,
        news: [...prev.news, ...matchNews, ...levelNews, ...challengeNews, ...achNews].slice(-200),
      };
    });
  }, [checkAchievementsAndQueue]);

  const trackTrophy = useCallback(() => {
    setState(prev => {
      const profile = adjustManagerReputation({
        ...prev.profile,
        trophiesWon: prev.profile.trophiesWon + 1,
        xp: prev.profile.xp + XP_REWARDS.trophy,
      }, "title");
      const date = new Date().toISOString().split("T")[0];
      const trophyNews: NewsItem = {
        id: `trophy-${Date.now()}`, date, read: false, tone: "big", icon: "🏆",
        headline: `TÍTULO CONQUISTADO! (+${XP_REWARDS.trophy} XP)`,
        body: `Mais um troféu para a galeria. Carreira histórica.`,
      };
      const { unlocked, profile: bumped, news } = checkAchievementsAndQueue(profile, prev.unlocked, date);
      return {
        ...prev,
        profile: bumped,
        unlocked,
        news: [...prev.news, trophyNews, ...news].slice(-200),
      };
    });
  }, [checkAchievementsAndQueue]);

  const trackBestPosition = useCallback((position: number) => {
    setState(prev => {
      if (position <= 0) return prev;
      if (position >= prev.profile.highestPosition) return prev;
      const profile = { ...prev.profile, highestPosition: position };
      const date = new Date().toISOString().split("T")[0];
      const { unlocked, profile: bumped, news } = checkAchievementsAndQueue(profile, prev.unlocked, date);
      return {
        ...prev,
        profile: bumped,
        unlocked,
        news: [...prev.news, ...news].slice(-200),
      };
    });
  }, [checkAchievementsAndQueue]);

  const syncChallengesForDate = useCallback((dateKey: string) => {
    setState(prev => {
      if (prev.challengeDate === dateKey) return prev;
      const fresh = rollDailyChallenges(dateKey);
      return { ...prev, challengeDate: dateKey, challenges: fresh };
    });
  }, []);

  const dismissToast = useCallback(() => {
    setToastQueue(q => q.slice(1));
  }, []);

  const markNewsRead = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      news: prev.news.map(n => n.id === id ? { ...n, read: true } : n),
    }));
  }, []);

  const markAllNewsRead = useCallback(() => {
    setState(prev => ({
      ...prev,
      news: prev.news.map(n => ({ ...n, read: true })),
    }));
  }, []);

  const resetMeta = useCallback(() => {
    setState(EMPTY_STATE);
    setToastQueue([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
  }, []);

  const unreadNewsCount = state.news.filter(n => !n.read).length;

  return (
    <MetaContext.Provider value={{
      profile: state.profile,
      unlocked: state.unlocked,
      news: state.news,
      challenges: state.challenges,
      unreadNewsCount,
      toastQueue,
      trackMatch,
      trackTrophy,
      trackBestPosition,
      syncChallengesForDate,
      dismissToast,
      markNewsRead,
      markAllNewsRead,
      resetMeta,
    }}>
      {children}
    </MetaContext.Provider>
  );
}
