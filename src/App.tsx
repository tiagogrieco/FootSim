import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import { MetaProvider } from "./context/MetaContext";
import { BoardProvider } from "./context/BoardContext";
import { BattlePassProvider } from "./context/BattlePassContext";
import { HallOfFameProvider } from "./context/HallOfFameContext";
import { I18nProvider } from "./context/I18nContext";
import { Auth } from "./components/Auth";
import { supabase } from "./lib/supabase";
import type { User } from "@supabase/supabase-js";

import MainMenu from "./pages/MainMenu";
import TeamSelection from "./pages/TeamSelection";
import PresentationView from "./pages/PresentationView";
import ModManagerView from "./pages/ModManagerView";
import GameLayout from "./components/GameLayout";
import Dashboard from "./pages/Dashboard";
import SquadView from "./pages/SquadView";
import MatchView from "./pages/MatchView";
import TacticsView from "./pages/TacticsView";
import TrainingView from "./pages/TrainingView";
import LeagueView from "./pages/LeagueView";
import TransferView from "./pages/TransferView";
import FinancesView from "./pages/FinancesView";
import PlayerProfileView from "./pages/PlayerProfileView";
import ClubView from "./pages/ClubView";
import ScoutingView from "./pages/ScoutingView";
import PackShop from "./pages/PackShop";
import AchievementsPage from "./pages/AchievementsPage";
import ChallengesPage from "./pages/ChallengesPage";
import NewsfeedPage from "./pages/NewsfeedPage";
import BoardPage from "./pages/BoardPage";
import BattlePassPage from "./pages/BattlePassPage";
import HallOfFamePage from "./pages/HallOfFamePage";

import YouthView from "./pages/YouthView";
import InboxView from "./pages/InboxView";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen to Auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium tracking-widest uppercase">Conectando à Nuvem...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2 tracking-tight">
            FootSim
          </h1>
          <p className="text-slate-400">Sincronização na nuvem ativada</p>
        </div>
        <Auth />
      </div>
    );
  }

  return (
    <I18nProvider>
      <BoardProvider>
       <GameProvider>
        <MetaProvider>
         <BattlePassProvider>
          <HallOfFameProvider>
           <BrowserRouter>
            <Routes>
              <Route path="/" element={<MainMenu />} />
              <Route path="/select-team" element={<TeamSelection />} />
              <Route path="/presentation" element={<PresentationView />} />
              <Route path="/mods" element={<ModManagerView />} />
              <Route path="/game" element={<GameLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="squad" element={<SquadView />} />
                <Route path="match" element={<MatchView />} />
                <Route path="league" element={<LeagueView />} />
                <Route path="tactics" element={<TacticsView />} />
                <Route path="training" element={<TrainingView />} />
                <Route path="transfers" element={<TransferView />} />
                <Route path="scouting" element={<ScoutingView />} />
                <Route path="packs" element={<PackShop />} />
                <Route path="finances" element={<FinancesView />} />
                <Route path="player/:id" element={<PlayerProfileView />} />
                <Route path="club" element={<ClubView />} />
                <Route path="club/:id" element={<ClubView />} />
                <Route path="achievements" element={<AchievementsPage />} />
                <Route path="challenges" element={<ChallengesPage />} />
                <Route path="news" element={<NewsfeedPage />} />
                <Route path="board" element={<BoardPage />} />
                <Route path="battlepass" element={<BattlePassPage />} />
                <Route path="hall-of-fame" element={<HallOfFamePage />} />
                <Route path="youth" element={<YouthView />} />
                <Route path="inbox" element={<InboxView />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
           </BrowserRouter>
          </HallOfFameProvider>
         </BattlePassProvider>
        </MetaProvider>
       </GameProvider>
      </BoardProvider>
    </I18nProvider>
  );
}
