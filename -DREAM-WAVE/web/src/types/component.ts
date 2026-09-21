import type { ReactNode } from "react";

export type WithChildren = {
  children: ReactNode;
};

export type WithClassName = {
  className?: string;
};

export type PolymorphicProps = WithChildren & WithClassName;
