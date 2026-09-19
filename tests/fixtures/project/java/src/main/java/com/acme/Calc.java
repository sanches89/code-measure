package com.acme;
public class Calc {
  public int abs(int a) {
    if (a < 0) {
      return -a;
    }
    return a;
  }
  static class Helper {
    int twice(int a) {
      return a * 2;
    }
  }
}
