export const mergeClassNames = (
  ...classNames: (string | undefined)[]
): string => {
  return classNames.filter(Boolean).join(" ");
};
