export function grade(score) {
  if (score < 0 || score > 100) {
    throw new RangeError("score out of range");
  }
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) {
    return "C";
  }
  return "F";
}

export function neverCalled(a, b) {
  if (a > b) {
    return a - b;
  }
  return b - a;
}
