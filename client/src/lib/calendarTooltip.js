const hasIndividualChildReason = (status) =>
  status.childrenNeedingCare?.some((child) => child.additionalReasons?.length > 0) || false;

const hasAdditionalEntry = (status) =>
  Boolean(
    status.p1
    || status.p2
    || status.care
    || status.p1RecurringLabels?.length
    || status.p2RecurringLabels?.length
    || hasIndividualChildReason(status)
  );

export const shouldShowDayTooltip = (status) => {
  if (!status) return false;
  if (status.publicHoliday) return hasAdditionalEntry(status);

  return Boolean(
    (status.schoolHoliday && !status.isWeekend)
    || hasAdditionalEntry(status)
  );
};
