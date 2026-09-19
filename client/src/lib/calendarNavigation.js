export const getAdjacentMonth = (year, month, direction) => {
  const target = new Date(Number(year), Number(month) + Number(direction), 1);
  return {
    year: target.getFullYear(),
    month: target.getMonth(),
  };
};
