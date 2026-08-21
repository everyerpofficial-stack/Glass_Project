import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/quotes")({
  component: () => <Navigate to="/" />,
});
