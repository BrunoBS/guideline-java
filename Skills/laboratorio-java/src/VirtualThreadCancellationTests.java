import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

public final class VirtualThreadCancellationTests {
    private VirtualThreadCancellationTests() {}

    public static void run() throws Exception {
        var gate = new BoundedCaller(1);
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var operationEntered = new AtomicBoolean();
        var interrupted = new AtomicBoolean();
        var failure = new AtomicReference<Throwable>();

        Thread holder = Thread.ofVirtual().start(() -> {
            try {
                gate.call(() -> {
                    entered.countDown();
                    if (!release.await(10, TimeUnit.SECONDS)) {
                        throw new AssertionError("holder timeout");
                    }
                    return null;
                });
            } catch (Throwable t) {
                failure.compareAndSet(null, t);
            }
        });

        if (!entered.await(5, TimeUnit.SECONDS)) throw new AssertionError("holder not ready");
        var waiting = new CountDownLatch(1);
        Thread waiter = Thread.ofVirtual().start(() -> {
            waiting.countDown();
            try {
                gate.call(() -> {
                    operationEntered.set(true);
                    return null;
                });
                failure.compareAndSet(null, new AssertionError("interrupted waiter acquired permit"));
            } catch (InterruptedException expected) {
                interrupted.set(true);
            } catch (Throwable t) {
                failure.compareAndSet(null, t);
            }
        });
        try {
            if (!waiting.await(5, TimeUnit.SECONDS)) throw new AssertionError("waiter not ready");
            waiter.interrupt();
            waiter.join(5_000);
            if (waiter.isAlive()) throw new AssertionError("waiter did not cancel");
            if (!interrupted.get()) throw new AssertionError("missing InterruptedException");
            if (operationEntered.get()) throw new AssertionError("cancelled operation ran");
        } finally {
            release.countDown();
            holder.join(5_000);
        }
        if (holder.isAlive()) throw new AssertionError("holder did not exit");
        if (failure.get() != null) throw new AssertionError("worker failure", failure.get());
        if (!"recovered".equals(gate.call(() -> "recovered"))) {
            throw new AssertionError("permit not recovered");
        }
        System.out.println("PASS: virtual-thread cancellation while waiting, permit recovery");
    }
}
