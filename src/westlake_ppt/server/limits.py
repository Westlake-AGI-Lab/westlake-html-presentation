"""Single-process request budgets; no durable state or model calls."""
import threading
import time
from collections import deque

class RequestLimits:
    """Single-process safeguards, not a provider-side monetary spending cap."""
    def __init__(self, hourly=30, daily=200, concurrent=2):
        self.hourly, self.daily, self.concurrent = hourly, daily, concurrent
        self.lock = threading.Lock()
        self.recent = {}
        self.day, self.count, self.active = None, 0, 0

    def acquire(self, address):
        now = time.time()
        with self.lock:
            day = int(now // 86400)
            if self.day != day:
                self.day, self.count = day, 0
            self.recent = {ip: deque(t for t in stamps if t > now - 3600)
                           for ip, stamps in self.recent.items() if stamps and stamps[-1] > now - 3600}
            stamps = self.recent.setdefault(address, deque())
            if self.active >= self.concurrent:
                return "当前使用人数较多，请稍后重试。"
            if self.count >= self.daily:
                return "今天的共享问答额度已用完，请明天再试。"
            if len(stamps) >= self.hourly:
                return "提问过于频繁，请稍后再试。"
            stamps.append(now)
            self.count += 1
            self.active += 1
            return None

    def release(self):
        with self.lock:
            self.active -= 1
