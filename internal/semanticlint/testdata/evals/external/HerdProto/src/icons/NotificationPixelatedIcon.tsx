import type { IconProps } from "./types";

export const NotificationPixelatedIcon = ({
  size = 24,
  fill = "#969696",
  variant = "line",
  className = "",
  ...otherProps
}: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      className={className}
      {...otherProps}
    >
      {variant === "line" ? (
        <>
          <path d="M3.62399 13.2024H6.02711V15.6024H3.62399V13.2024Z" fill={fill} />
          <path
            d="M20.4272 15.6025V13.2025H18.0265V3.60205H15.6265V13.2028H18.024V15.6025H20.424V18.0025H3.62399V15.6025H1.22083V20.4025H1.22399H8.42083V22.8025H15.624V20.4025H22.824H22.8272V15.6025H20.4272Z"
            fill={fill}
          />
          <path
            d="M8.42333 3.60258H15.624V1.20258H8.42083V3.60205H6.02333C6.02562 6.79157 6.02105 10.0086 6.02333 13.1982H8.42333C8.42105 10.0088 8.42562 6.79192 8.42333 3.60258Z"
            fill={fill}
          />
          <path d="M13.224 13.2024H15.624V15.6024H13.224V13.2024Z" fill={fill} />
        </>
      ) : (
        <>
          <path d="M3.62317 13.2026H6.02629V15.6026H3.62317V13.2026Z" fill={fill} />
          <path d="M2.99817 14.9999H20.9982V17.9999H2.99817V14.9999Z" fill={fill} />
          <path d="M4.99817 12.9999H18.9982V15.9999H4.99817V12.9999Z" fill={fill} />
          <path
            d="M20.4272 15.6025V13.2025H18.0265V3.60205H15.6265V13.2028H18.024V15.6025H20.424V18.0025H3.62399V15.6025H1.22083V20.4025H1.22399H8.42083V22.8025H15.624V20.4025H22.824H22.8272V15.6025H20.4272Z"
            fill={fill}
          />
          <path
            d="M8.4233 3.60258H15.624V1.20258H8.4208V3.60205H6.0233C6.02559 6.79157 6.02102 10.0086 6.0233 13.1982H8.4233C8.42102 10.0088 8.42559 6.79192 8.4233 3.60258Z"
            fill={fill}
          />
          <path d="M13.224 13.2024H15.624V15.6024H13.224V13.2024Z" fill={fill} />
          <path d="M8 3H16V16H8V3Z" fill={fill} />
        </>
      )}
    </svg>
  );
};
