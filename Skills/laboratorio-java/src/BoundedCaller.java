import java.util.Objects;
import java.util.concurrent.Callable;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public final class BoundedCaller {
    private final Semaphore permits;

    public BoundedCaller(int maxConcurrent) {
        if (maxConcurrent <= 0) throw new IllegalArgumentException("maxConcurrent");
        this.permits = new Semaphore(maxConcurrent);
    }

    public <T> T call(Callable<T> operation) throws Exception {
        Objects.requireNonNull(operation, "operation");
        if (!permits.tryAcquire(200, TimeUnit.MILLISECONDS)) {
            throw new TimeoutException("Dependency capacity exhausted");
        }
        try {
            return operation.call();
        } finally {
            permits.release();
        }
    }
}
