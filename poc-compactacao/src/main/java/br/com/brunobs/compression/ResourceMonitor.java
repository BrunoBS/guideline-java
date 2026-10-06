package br.com.brunobs.compression;

import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.LockSupport;

/**
 * Captures process CPU time and sampled JVM heap usage around one operation.
 * Heap peak is sampled and can miss short-lived peaks; native memory is not included.
 */
final class ResourceMonitor {
    private static final long HEAP_SAMPLE_INTERVAL_NANOS = 5_000_000L;
    private static final Runtime RUNTIME = Runtime.getRuntime();
    private static final com.sun.management.OperatingSystemMXBean OPERATING_SYSTEM =
            ManagementFactory.getOperatingSystemMXBean()
                    instanceof com.sun.management.OperatingSystemMXBean bean ? bean : null;

    private ResourceMonitor() { }

    static <T> Measurement<T> measure(Operation<T> operation) throws IOException {
        HeapSampler sampler = new HeapSampler();
        sampler.start();

        long heapBefore = usedHeap();
        long cpuBefore = processCpuTime();
        long wallStarted = System.nanoTime();
        T value;
        long elapsedNanos;
        long cpuAfter;
        try {
            value = operation.run();
        } finally {
            elapsedNanos = System.nanoTime() - wallStarted;
            cpuAfter = processCpuTime();
            sampler.close();
        }

        return new Measurement<>(value, elapsedNanos, cpuDifference(cpuBefore, cpuAfter),
                heapBefore, sampler.peakBytes(), usedHeap());
    }

    private static long usedHeap() {
        return RUNTIME.totalMemory() - RUNTIME.freeMemory();
    }

    private static long processCpuTime() {
        return OPERATING_SYSTEM == null ? -1 : OPERATING_SYSTEM.getProcessCpuTime();
    }

    private static long cpuDifference(long before, long after) {
        return before < 0 || after < before ? -1 : after - before;
    }

    @FunctionalInterface
    interface Operation<T> {
        T run() throws IOException;
    }

    record Measurement<T>(T value, long elapsedNanos, long processCpuNanos,
                          long heapBeforeBytes, long heapPeakBytes, long heapAfterBytes) {
        double processCpuPercentOfOneCore() {
            if (processCpuNanos < 0 || elapsedNanos <= 0) return -1;
            return 100d * processCpuNanos / elapsedNanos;
        }
    }

    private static final class HeapSampler implements AutoCloseable {
        private final AtomicLong peakBytes = new AtomicLong();
        private final CountDownLatch firstSample = new CountDownLatch(1);
        private volatile boolean running = true;
        private Thread worker;

        private void start() throws IOException {
            worker = new Thread(this::sampleWhileRunning, "compression-heap-sampler");
            worker.setDaemon(true);
            worker.start();
            try {
                firstSample.await();
            } catch (InterruptedException interrupted) {
                close();
                Thread.currentThread().interrupt();
                throw new IOException("Interrompido ao iniciar a amostragem de heap.", interrupted);
            }
        }

        private void sampleWhileRunning() {
            do {
                observeHeap();
                firstSample.countDown();
                LockSupport.parkNanos(HEAP_SAMPLE_INTERVAL_NANOS);
            } while (running);
            observeHeap();
        }

        private void observeHeap() {
            long used = usedHeap();
            long previous;
            do {
                previous = peakBytes.get();
                if (used <= previous) return;
            } while (!peakBytes.compareAndSet(previous, used));
        }

        private long peakBytes() {
            return peakBytes.get();
        }

        @Override
        public void close() {
            if (worker == null) return;
            running = false;
            worker.interrupt();
            boolean interrupted = false;
            while (worker.isAlive()) {
                try {
                    worker.join();
                } catch (InterruptedException ignored) {
                    interrupted = true;
                }
            }
            if (interrupted) Thread.currentThread().interrupt();
        }
    }
}
