export type ReportColumn = {
  readonly key: string;
  readonly heading: string;
  readonly width: number;
  readonly alignment: "left" | "right";
};

export const renderHeading = (column: ReportColumn): string => {
  const padding = " ".repeat(column.width - column.heading.length);

  return column.alignment === "right" ? `${padding}${column.heading}` : column.heading;
};
