"use client";

import { createContext, useContext } from "react";

type DiagramActions = {
  openSettings: (nodeId: string) => void;
  refreshLive: () => void;
};

export const DiagramActionsContext = createContext<DiagramActions>({
  openSettings: () => {},
  refreshLive: () => {},
});

export function useDiagramActions() {
  return useContext(DiagramActionsContext);
}
