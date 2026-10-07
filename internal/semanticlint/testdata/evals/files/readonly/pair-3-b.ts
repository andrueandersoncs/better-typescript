export type ReportColumn = Readonly<{
  key: string;
  heading: string;
  width: number;
  alignment: "left" | "right";
}>;

export const renderHeading = (column: ReportColumn): string => {
  const padding = " ".repeat(column.width - column.heading.length);

  return column.alignment === "right" ? `${padding}${column.heading}` : column.heading;
};
