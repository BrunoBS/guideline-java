package br.com.brunobs.compression;

import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.LockSupport;

import oshi.SystemInfo;
import oshi.software.os.OSProcess;
import oshi.software.os.OperatingSystem;

/**
 * Captures process CPU time and sampled JVM/process memory around one operation.
 * Memory peaks are sampled and can miss short-lived peaks.
 */
final class ResourceMonitor {
    private static final long MEMORY_SAMPLE_INTERVAL_NANOS = 20_000_000L;
    private static final Runtime RUNTIME = Runtime.getRuntime();
    private static final com.sun.management.OperatingSystemMXBean CPU_BEAN =
            ManagementFactory.getOperatingSystemMXBean()
                    instanceof com.sun.management.OperatingSystemMXBean bean ? bean : null;
    private static final OperatingSystem OPERATING_SYSTEM = new SystemInfo().getOperatingSystem();
    private static final int PROCESS_ID = OPERATING_SYSTEM.getProcessId();

    private ResourceMonitor() { }

    static <T> Measurement<T> measure(Operation<T> operation) throws IOException {
        MemorySampler sampler = new MemorySampler();
        sampler.start();

        MemorySnapshot before = memorySnapshot();
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

        MemorySnapshot after = memorySnapshot();
        return new Measurement<>(value, elapsedNanos, cpuDifference(cpuBefore, cpuAfter),
                before.heapBytes(), sampler.heapPeakBytes(), after.heapBytes(),
                before.rssBytes(), sampler.rssPeakBytes(), after.rssBytes(),
                before.privateResidentBytes(), sampler.privateResidentPeakBytes(),
                after.privateResidentBytes());
    }

    private static MemorySnapshot memorySnapshot() {
        long heap = RUNTIME.totalMemory() - RUNTIME.freeMemory();
        ProcessMemory processMemory = processMemory();
        return new MemorySnapshot(heap, processMemory.rssBytes(), processMemory.privateResidentBytes());
    }

    private static ProcessMemory processMemory() {
        try {
            OSProcess process = OPERATING_SYSTEM.getProcess(PROCESS_ID);
            return process == null
                    ? new ProcessMemory(-1, -1)
                    : new ProcessMemory(process.getResidentMemory(), process.getPrivateResidentMemory());
        } catch (RuntimeException unavailable) {
            return new ProcessMemory(-1, -1);
        }
    }

    private static long processCpuTime() {
        return CPU_BEAN == null ? -1 : CPU_BEAN.getProcessCpuTime();
    }

    private static long cpuDifference(long before, long after) {
        return before < 0 || after < before ? -1 : after - before;
    }

    @FunctionalInterface
    interface Operation<T> {
        T run() throws IOException;
    }

    record Measurement<T>(T value, long elapsedNanos, long processCpuNanos,
                          long heapBeforeBytes, long heapPeakBytes, long heapAfterBytes,
                          long rssBeforeBytes, long rssPeakBytes, long rssAfterBytes,
                          long privateResidentBeforeBytes, long privateResidentPeakBytes,
                          long privateResidentAfterBytes) {
        double processCpuPercentOfOneCore() {
            if (processCpuNanos < 0 || elapsedNanos <= 0) return -1;
            return 100d * processCpuNanos / elapsedNanos;
        }
    }

    private record MemorySnapshot(long heapBytes, long rssBytes, long privateResidentBytes) { }

    private record ProcessMemory(long rssBytes, long privateResidentBytes) { }

    private static final class MemorySampler implements AutoCloseable {
        private final AtomicLong heapPeakBytes = new AtomicLong();
        private final AtomicLong rssPeakBytes = new AtomicLong(-1);
        private final AtomicLong privateResidentPeakBytes = new AtomicLong(-1);
        private final CountDownLatch firstSample = new CountDownLatch(1);
        private volatile boolean running = true;
        private Thread worker;

        private void start() throws IOException {
            worker = new Thread(this::sampleWhileRunning, "compression-memory-sampler");
            worker.setDaemon(true);
            worker.start();
            try {
                firstSample.await();
            } catch (InterruptedException interrupted) {
                close();
                Thread.currentThread().interrupt();
                throw new IOException("Interrompido ao iniciar a amostragem de memória.", interrupted);
            }
        }

        private void sampleWhileRunning() {
            do {
                observeMemory();
                firstSample.countDown();
                LockSupport.parkNanos(MEMORY_SAMPLE_INTERVAL_NANOS);
            } while (running);
            observeMemory();
        }

        private void observeMemory() {
            MemorySnapshot snapshot = memorySnapshot();
            updateMaximum(heapPeakBytes, snapshot.heapBytes());
            updateMaximum(rssPeakBytes, snapshot.rssBytes());
            updateMaximum(privateResidentPeakBytes, snapshot.privateResidentBytes());
        }

        private void updateMaximum(AtomicLong peak, long value) {
            if (value < 0) return;
            long previous;
            do {
                previous = peak.get();
                if (value <= previous) return;
            } while (!peak.compareAndSet(previous, value));
        }

        private long heapPeakBytes() {
            return heapPeakBytes.get();
        }

        private long rssPeakBytes() {
            return rssPeakBytes.get();
        }

        private long privateResidentPeakBytes() {
            return privateResidentPeakBytes.get();
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
