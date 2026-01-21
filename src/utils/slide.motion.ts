import type { TargetAndTransition } from "framer-motion";
import type { TransitionMode } from "../components/setting-sheet";

export type MotionTriplet = {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
};

export function getMotionTriplet(
  mode: TransitionMode,
  isImage: boolean,
  kenBurns: boolean,
): MotionTriplet {
  if (mode === "slide") {
    return {
      initial: { opacity: 0, x: 60 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -60 },
    };
  }

  if (mode === "flip") {
    return {
      initial: { opacity: 0, rotateY: -70, x: 40, transformPerspective: 1200 },
      animate: { opacity: 1, rotateY: 0, x: 0, transformPerspective: 1200 },
      exit: { opacity: 0, rotateY: 70, x: -40, transformPerspective: 1200 },
    };
  }

  if (mode === "zoom") {
    return {
      initial: { opacity: 0, scale: 0.97 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 1.03 },
    };
  }

  if (mode === "pan") {
    return {
      initial: { opacity: 0, x: 24 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -24 },
    };
  }

  return {
    initial: { opacity: 0, scale: isImage && kenBurns ? 1.03 : 1 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: isImage && kenBurns ? 1.01 : 1 },
  };
}
