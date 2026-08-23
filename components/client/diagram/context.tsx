"use client";

import { createContext, useContext } from "react";

type DiagramActions = {
  openSettings: (nodeId: string) => void;
};

export const DiagramActionsContext = createContext<DiagramActions>({
  openSettings: () => {},
});

export function useDiagramActions() {
  return useContext(DiagramActionsContext);
}
