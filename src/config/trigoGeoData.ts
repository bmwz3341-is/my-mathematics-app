import { ArrowRightLeft, Box, CircleDot, Equal, Layers, Ruler, SquareFunction, Triangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface TopicCard {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge: string;
}

export const TRIGOGEO_CARDS: TopicCard[] = [
  { id: "trigLaws", label: "משפטי הסינוסים והקוסינוסים", href: "/mathematics/trig-rules", icon: Triangle, badge: "sin/cos" },
  { id: "triangleArea", label: "מחשבון שטחי מצולעים", href: "/mathematics/triangle-area", icon: Ruler, badge: "S" },
  { id: "trigIdentities", label: "זהויות טריגונומטריות", href: "/mathematics/trig-identities", icon: Equal, badge: "≡" },
  { id: "trigEquations", label: "משוואות טריגונומטריות", href: "/mathematics/trig-equations", icon: SquareFunction, badge: "=0" },
  { id: "unitCircleRadians", label: "מעגל היחידה ורדיאנים", href: "/mathematics/unit-circle-radians", icon: CircleDot, badge: "rad" },
  { id: "algebraicVectors", label: "וקטורים אלגבריים", href: "/mathematics/algebraic-vectors", icon: ArrowRightLeft, badge: "Vec" },
  { id: "spaceGeometry3D", label: "גיאומטריה של המרחב", href: "/mathematics/geometry-3d", icon: Box, badge: "3D" },
  { id: "planeLineEquation", label: "משוואת מישור וישר", href: "/mathematics/plane-and-line-equations", icon: Layers, badge: "Plane" },
];
