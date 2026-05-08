import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import { I18nProvider } from "./context/I18nContext";
import MainMenu from "./pages/MainMenu";
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

export default function App() {
  return (
    <I18nProvider>
      <GameProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainMenu />} />
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
              <Route path="finances" element={<FinancesView />} />
              <Route path="player/:id" element={<PlayerProfileView />} />
              <Route path="club" element={<ClubView />} />
              <Route path="club/:id" element={<ClubView />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </GameProvider>
    </I18nProvider>
  );
}
