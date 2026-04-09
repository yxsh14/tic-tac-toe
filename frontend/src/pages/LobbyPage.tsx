import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LobbyScreen from "@/components/LobbyScreen";
import { ROUTES } from "@/constants/routeConst";
import { useCreateMatchMutation } from "@/hooks/match/useCreateMatchMutation";
import { useJoinMatchMutation } from "@/hooks/match/useJoinMatchMutation";
import { useNakamaSession } from "@/hooks/nakama/useNakamaSession";
import { usePlayer } from "@/contexts/PlayerContext";

const LobbyPage = () => {
  const navigate = useNavigate();
  const { player, clearPlayer } = usePlayer();
  const [roomId, setRoomId] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [createdMatchId, setCreatedMatchId] = useState("");
  const [rpcError, setRpcError] = useState<string | null>(null);

  const sessionQuery = useNakamaSession(player?.name);
  const createMut = useCreateMatchMutation();
  const joinMut = useJoinMatchMutation();

  useEffect(() => {
    if (!player) {
      navigate(ROUTES.AUTH, { replace: true });
    }
  }, [player, navigate]);

  if (!player) {
    return null;
  }

  const goGame = (matchId: string) => {
    navigate(`${ROUTES.GAME}?matchId=${encodeURIComponent(matchId)}`);
  };

  const handleCreate = async () => {
    setRpcError(null);
    try {
      const r = await createMut.mutateAsync({ displayName: player.name });
      if (!r.ok || !r.data?.matchId) {
        setRpcError(r.error || "Could not create match.");
        return;
      }
      setCreatedMatchId(r.data.matchId);
      setWaiting(true);
    } catch (e) {
      setRpcError(e instanceof Error ? e.message : "Network error (is Nakama running?)");
    }
  };

  const handleJoin = async () => {
    setRpcError(null);
    const id = roomId.trim();
    if (!id) return;
    try {
      const r = await joinMut.mutateAsync({ matchId: id, displayName: player.name });
      if (!r.ok) {
        setRpcError(r.error || "Could not join match.");
        return;
      }
      goGame(id);
    } catch (e) {
      setRpcError(e instanceof Error ? e.message : "Network error (is Nakama running?)");
    }
  };

  return (
    <LobbyScreen
      player={player}
      roomId={roomId}
      onRoomIdChange={setRoomId}
      waiting={waiting}
      createdMatchId={createdMatchId}
      onCreate={handleCreate}
      onJoin={handleJoin}
      onEnterCreatedMatch={() => goGame(createdMatchId)}
      onCancelWaiting={() => {
        setWaiting(false);
        setCreatedMatchId("");
      }}
      onLogout={() => {
        clearPlayer();
        navigate(ROUTES.AUTH, { replace: true });
      }}
      isCreating={createMut.isPending}
      isJoining={joinMut.isPending}
      rpcError={rpcError}
      sessionReady={sessionQuery.isSuccess}
      sessionError={sessionQuery.isError}
    />
  );
};

export default LobbyPage;
