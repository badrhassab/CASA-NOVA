"""Simulated oxygen and life-support telemetry.

Demo values only, not flight rules. Swap step() for real sensor data later.
"""
import random

NUMERIC = ("o2", "p", "co2", "scrub", "lsBat", "suitO2", "suitBat")
MODES = {"cabin", "eva"}
SCENARIOS = {"nominal", "scrubber", "leak"}

START = {
    "o2": 20.9,        # cabin O2, %
    "p": 101.3,        # cabin pressure, kPa
    "co2": 2.2,        # CO2 partial pressure, mmHg
    "scrub": 97.0,     # scrubber efficiency, %
    "lsBat": 92.0,     # life-support battery, %
    "suitO2": 100.0,   # suit O2 reserve, % (100% = 8 h)
    "suitBat": 100.0,  # suit battery, %
    "hist": [2.2] * 40,
}


def _jitter(n):
    return (random.random() - 0.5) * n


def step(s, mode, scenario):
    """Advance the simulation by one second."""
    eva = mode == "eva"
    fault = scenario == "scrubber"
    leak = scenario == "leak"
    co2 = max(1.8, (s["co2"] + 0.07 if fault else s["co2"] + (2.2 - s["co2"]) * 0.15) + _jitter(0.03))
    return {
        "o2": 20.9 + _jitter(0.06),
        "p": min(101.3, max(40, s["p"] - 0.6) if leak else s["p"] + 2),
        "co2": co2,
        "scrub": max(35, s["scrub"] - 2.5) if fault else min(97, s["scrub"] + 1.5),
        "lsBat": max(0, s["lsBat"] - 0.01),
        "suitO2": max(0, s["suitO2"] - 0.15) if eva else min(100, s["suitO2"] + 2),
        "suitBat": max(0, s["suitBat"] - 0.12) if eva else min(100, s["suitBat"] + 1),
        "hist": (s["hist"] + [co2])[-40:],
    }