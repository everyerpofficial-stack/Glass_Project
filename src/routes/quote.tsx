import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/quote")({
  component: () => <Navigate to="/booking" />,
});
