import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.ArrayList;
import java.util.List;

public final class SmokeTests {
    public static void main(String[] args) throws Exception {
        assertEquals("flag.enabled", new ConfigurationKey("flag.enabled").value());
        expect(NullPointerException.class, () -> new ConfigurationKey(null));
        expect(IllegalArgumentException.class, () -> new ConfigurationKey(" "));
        expect(IllegalArgumentException.class, () -> new ConfigurationKey("a".repeat(81)));
        expect(IllegalArgumentException.class, () -> new ConfigurationKey("a..b"));
        expect(IllegalArgumentException.class, () -> new BoundedCaller(0));
        var caller = new BoundedCaller(3);
        var active = new AtomicInteger();
        var max = new AtomicInteger();
        try (var executor = Executors.newFixedThreadPool(3)) {
            List<Future<Integer>> futures = new ArrayList<>();
            for (int i = 0; i < 20; i++) {
                futures.add(executor.submit(() -> caller.call(() -> {
                    int current = active.incrementAndGet();
                    max.accumulateAndGet(current, Math::max);
                    try { Thread.sleep(5); return 1; }
                    finally { active.decrementAndGet(); }
                })));
            }
            for (var future : futures) assertEquals(1, future.get());
        }
        if (max.get() > 3) throw new AssertionError("Exceeded limit");
        expect(IllegalStateException.class, () -> caller.call(() -> { throw new IllegalStateException("boom"); }));
        assertEquals("recovered", caller.call(() -> "recovered"));
        System.out.println("PASS: key validation, bounded concurrency, release on exception");
    }
    private static void assertEquals(Object expected, Object actual) {
        if (!expected.equals(actual)) throw new AssertionError(expected + " != " + actual);
    }
    private static void expect(Class<? extends Throwable> type, Throwing action) throws Exception {
        try { action.run(); }
        catch (Throwable failure) {
            if (type.isInstance(failure)) return;
            throw new AssertionError("Unexpected exception", failure);
        }
        throw new AssertionError("Expected " + type.getName());
    }
    @FunctionalInterface interface Throwing { void run() throws Exception; }
}
