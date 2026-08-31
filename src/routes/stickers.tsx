import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/stickers")({
  component: StickersRedirect,
});

function StickersRedirect() {
  return <Navigate to="/work-order" search={{ tab: "stickers" }} replace />;
}
