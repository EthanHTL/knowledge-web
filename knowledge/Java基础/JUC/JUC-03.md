## 估算线程数

线程数 = CPU可用核数 / 1-阻塞系数（io密集型接近1，计算密集型接近0）

eg.  16核 / 0.9 = 17



## `volatile`



volatile 关键字，使一个变量在多个线程间可见
A B线程都用到一个变量，java默认是A线程中保留一份copy，这样如果B线程修改了该变量，则A线程未必知道
使用volatile关键字，会让所有线程都会读到变量的修改值

volatile并不能保证多个线程共同修改running变量时所带来的不一致问题，也就是说volatile不能替代synchronized

相关资料：

http://www.cnblogs.com/nexiyi/p/java_memory_model_and_thread.html

- volatile 引用类型（包括数组）只能保证引用本身的可见性，不能保证内部字段的可见性

  ```java
  public class T02_VolatileReference1 {
      boolean running = true;
      volatile static T02_VolatileReference1 T = new T02_VolatileReference1();
      void m() {
          System.out.println("m start");
          while(running) {
          }
          System.out.println("m end!");
      }
      public static void main(String[] args) {
          new Thread(T::m, "t1").start();
          TimeUnit.SECONDS.sleep(1);
          T.running = false;
      }
  }
  // 结果： 程序一直运行，无法结束
  ```
  
- 分析：volatile 并不能保证多个线程共同修改running 变量是所带来的不一致性问题，也就是volatile 不能替代synchronize

  ```java
  public class T04 {
      /*volatile*/ int count = 0;
      synchronized void m() {
          for (int i = 0; i < 10000; i++) {
              count++;
          }
      }
      public static void main(String[] args) {
          T04 t = new T04();
          List<Thread> threads = new ArrayList<>();
          for (int i = 1; i <= 10; i++) {
              new Thread(t::m, "thread-" + i).start();
          }
          threads.forEach(Thread::start);
          threads.forEach((o) -> {
              // 确保线程执行完毕，主线程才结束运行
              o.join();
          });
          System.out.println(t.count);
      }
  }
  ```



## AtomicXXX 原子类

解决上述同样的问题的更高效的方法，使用AtomXXX类，AtomXXX类本身方法都是原子性的，但不能保证多个方法连续调用是原子性的

### LongAdder

LongAdder类是JDK1.8新增的一个原子性操作类。

`LongAdder`类与`AtomicLong`类的区别在于高并发时前者将对单一变量的CAS操作分散为对数组`cells`中多个元素的CAS操作，取值时进行求和；而在并发较低时仅对`base`变量进行CAS操作，与`AtomicLong`类原理相同。不得不说这种分布式的设计还是很巧妙的。

- Atomic Vs  Sync  Vs  LongAdder

```java
public class T02_AtomicVsSyncVsLongAdder {
    static long count2 = 0L;
    static AtomicLong count1 = new AtomicLong(0L);
    static LongAdder count3 = new LongAdder();
    public static void main(String[] args) throws Exception {
        Thread[] threads = new Thread[1000];
        for(int i=0; i<threads.length; i++) {
            threads[i] = new Thread(()-> { 
                for(int k=0; k<100000; k++) count1.incrementAndGet();
          });
        }

        long start = System.currentTimeMillis();
        for(Thread t : threads ) t.start();
        for (Thread t : threads) t.join();
        long end = System.currentTimeMillis();
        System.out.println("Atomic: " + count1.get() + " time " + (end-start));
        
        //---------------------------------synchronized--------------------------
        Object lock = new Object();
        for(int i=0; i<threads.length; i++) {
            threads[i] = new Thread(new Runnable() {
                        @Override
                        public void run() {
                            for (int k = 0; k < 100000; k++)
                                synchronized (lock) {
                                    count2++;
                                }
                        }
                    });
        }
        start = System.currentTimeMillis();
        for(Thread t : threads ) t.start();
        for (Thread t : threads) t.join();
        end = System.currentTimeMillis();
        System.out.println("Sync: " + count2 + " time " + (end-start));

        //--------------------------------LongAdder-----------------------------
        for(int i=0; i<threads.length; i++) {
            threads[i] =
                    new Thread(()-> {
                        for(int k=0; k<100000; k++) count3.increment();
                    });
        }
        start = System.currentTimeMillis();
        for(Thread t : threads ) t.start();
        for (Thread t : threads) t.join();
        end = System.currentTimeMillis();
        System.out.println("LongAdder: " + count1.longValue() + " time " + (end-start));
    }
    static void microSleep(int m) {
        try {
            TimeUnit.MICROSECONDS.sleep(m);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}
```

>**结果：**
>
>Atomic: 100000000 time 1421
>Sync: 100000000 time 5228
>LongAdder: 100000000 time 427

## synchronized优化

```java
int count = 0;

synchronized void m1() {
    //do sth need not sync
    try {
        TimeUnit.SECONDS.sleep(2);
    } 
    //业务逻辑中只有下面这句需要sync，这时不应该给整个方法上锁
    count ++;
    //do sth need not sync
    try {
        TimeUnit.SECONDS.sleep(2);
    } 
}

void m2() {
    //do sth need not sync
    try {
        TimeUnit.SECONDS.sleep(2);
    }
    //业务逻辑中只有下面这句需要sync，这时不应该给整个方法上锁
    //采用细粒度的锁，可以使线程争用时间变短，从而提高效率
    synchronized(this) {
        count ++;
    }
    //do sth need not sync
    try {
        TimeUnit.SECONDS.sleep(2);
    }
}
```

**总结：** 同步代码块中的语句越少越好

注意：锁定某对象o，如果o的属性发生改变，不影响锁的使用
			但是如果o变成另外一个对象，则锁定的对象发生改变
			**应该避免将锁定对象的引用变成另外的对象**

### Unsafe 类

Unsafe类是在sun.misc包下，不属于Java标准。但是很多Java的基础类库，包括一些被广泛使用的高性能开发库都是基于Unsafe类开发的，比如Netty、Hadoop、Kafka等。

使用Unsafe可用来直接访问系统内存资源并进行自主管理，Unsafe类在提升Java运行效率，增强Java语言底层操作能力方面起了很大的作用。

Unsafe可认为是Java中留下的后门，提供了一些低层次操作，如直接内存访问、线程调度等。

 官方并不建议使用Unsafe。

```java
import sun.misc.Unsafe;

public class HelloUnsafe {
    static class M {
        private M() {}
        int i =0;
    }
    public static void main(String[] args) throws InstantiationException {
        Unsafe unsafe = Unsafe.getUnsafe();
        M m = (M)unsafe.allocateInstance(M.class);
        m.i = 9;
        System.out.println(m.i);
    }
}
```

**资料：** https://www.jb51.net/article/140726.htm

## 其它锁

### ReentrantLock

**注意：**必须要必须要必须要手动释放锁

使用syn锁定的话如果遇到异常，jvm会自动释放锁，但是lock必须手动释放锁，因此经常在finally中进行锁的释放

#### 用法

```java
Lock lock = new ReentrantLock();
void m1() {
    try {
        lock.lock();
        for (int i = 0; i < 3; i++) {
            TimeUnit.SECONDS.sleep(1);
            System.out.println(i);
        }
    } catch (InterruptedException e) {
        e.printStackTrace();
    } finally {
        lock.unlock();
    }
}
/**
   * 使用tryLock进行尝试锁定，不管锁定与否，方法都将继续执行
   * 可以根据tryLock的返回值来判定是否锁定
   * 也可以指定tryLock的时间，由于tryLock(time)抛出异常，所以要注意unclock的处理，必须放到finally中
   */
void m2() {
    boolean locked = false;
    try {
        locked = lock.tryLock(5, TimeUnit.SECONDS);
        System.out.println("m2 ..." + locked);
    } catch (InterruptedException e) {
        e.printStackTrace();
    } finally {
        if(locked) lock.unlock();
    }
}
public static void main(String[] args) {
    T03_ReentrantLock3 rl = new T03_ReentrantLock3();
    new Thread(rl::m1).start();
    TimeUnit.SECONDS.sleep(1);
    new Thread(rl::m2).start();
}
结果：
t1 start
interrupted!
Exception in thread "Thread-1" java.lang.IllegalMonitorStateException
```



#### lockInterruptibly方法

使用ReentrantLock还可以调用lockInterruptibly方法，可以对线程interrupt方法做出响应，在一个线程等待锁的过程中，可以被打断

```java
    public static void main(String[] args) {
        Lock lock = new ReentrantLock();
        Thread t1 = new Thread(()->{
            try {
                lock.lock();
                System.out.println("t1 start");
                TimeUnit.SECONDS.sleep(Integer.MAX_VALUE);
                System.out.println("t1 end");
            } catch (InterruptedException e) {
                System.out.println("interrupted!");
            } finally {
                lock.unlock();
            }
        });
        t1.start();

        Thread t2 = new Thread(()->{
            try {
                //lock.lock();
                lock.lockInterruptibly(); //可以对interrupt()方法做出响应
                System.out.println("t2 start");
                TimeUnit.SECONDS.sleep(5);
                System.out.println("t2 end");
            } catch (InterruptedException e) {
                System.out.println("interrupted!");
            } finally {
                lock.unlock();
            }
        });
        t2.start();

        try {
            TimeUnit.SECONDS.sleep(1);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        t2.interrupt(); //打断线程2的等待

    }
```

#### 指定为公平锁

```java
private static ReentrantLock lock=new ReentrantLock(true); //参数为true表示为公平锁，请对比输出结果
public void run() {
    for(int i=0; i<100; i++) {
        lock.lock();
        try{
            System.out.println(Thread.currentThread().getName()+"获得锁");
        }finally{
            lock.unlock();
        }
    }
}
public static void main(String[] args) {
    T05_ReentrantLock5 rl=new T05_ReentrantLock5();
    Thread th1=new Thread(rl);
    Thread th2=new Thread(rl);
    th1.start();
    th2.start();
}
```

### CountDownLatch

是一个同步工具类，用来协调多个线程之间的同步。

CountDownLatch能够使一个线程在等待另外一些线程完成各自工作之后，再继续执行。使用一个计数器进行实现。==计数器初始值为线程的数量==。当每一个线程完成自己任务后，计数器的值就会减一。当计数器的值为0时，表示所有的线程都已经完成一些任务，然后在CountDownLatch上等待的线程就可以恢复执行接下来的任务。

#### 用法

```java
public static void main(String[] args) {
    usingJoin();
    usingCountDownLatch();
}
private static void usingCountDownLatch() {
    Thread[] threads = new Thread[100];
    CountDownLatch latch = new CountDownLatch(threads.length); // 初始计数器为线程的数量
    for(int i=0; i<threads.length; i++) {
        threads[i] = new Thread(()->{
            int result = 0;
            for(int j=0; j<10000; j++) result += j;
            latch.countDown();
        });
    }
    for (int i = 0; i < threads.length; i++) {
        threads[i].start();
    }
    try {
        latch.await();
    } catch (InterruptedException e) {
        e.printStackTrace();
    }
    System.out.println("end latch");
}
private static void usingJoin() {
    Thread[] threads = new Thread[100];
    for(int i=0; i<threads.length; i++) {
        threads[i] = new Thread(()->{
            int result = 0;
            for(int j=0; j<10000; j++) result += j;
        });
    }
    for (int i = 0; i < threads.length; i++) {
        threads[i].start();
    }
    for (int i = 0; i < threads.length; i++) {
        try {
            threads[i].join();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
    System.out.println("end join");
}
```

#### 不足

CountDownLatch是一次性的，计算器的值只能在构造方法中初始化一次，之后没有任何机制再次对其设置值，当CountDownLatch使用完毕后，它不能再次被使用。

**资料：**

https://www.cnblogs.com/Lee_xy_z/p/10470181.html

### CyclicBarrier

循环等待足够多的线程之后再放行

#### 用法

```java
public static void main(String[] args) {
    // CyclicBarrier barrier = new CyclicBarrier(20);
    CyclicBarrier barrier = new CyclicBarrier(20, () -> System.out.println("满人"));
    /*CyclicBarrier barrier = new CyclicBarrier(20, new Runnable() {
        @Override
        public void run() {
            System.out.println("满人，发车");
        }
    });*/
    for(int i=0; i<100; i++) {
        new Thread(()->{
            try {
                barrier.await();
            } catch (InterruptedException e) {
                e.printStackTrace();
            } catch (BrokenBarrierException e) {
                e.printStackTrace();
            }
        }).start();
    }
}
```

#### 与CountDownLatch相比

| CyclicBarrier                                                | CountDownLatch                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| 减计数方式                                                   | 加计数方式                                                   |
| 计算为0时释放所有等待的线程                                  | 计数达到指定值时释放所有等待线程                             |
| 计数为0时，无法重置                                          | 计数达到指定值时，计数置为0重新开始                          |
| 调用countDown()方法计数减一，调用await()方法只进行阻塞，对计数没任何影响 | 调用await()方法计数加1，若加1后的值不等于构造方法的值，则线程阻塞 |
| 不可重复利用                                                 | 可重复利用                                                   |

### Phaser

**链接：**  https://blog.csdn.net/jinggod/article/details/78704382

#### 介绍

Phaser允许并发多阶段任务。Phaser类机制是在每一步结束的位置对线程进行同步，当所有的线程都完成了这一步，才允许执行下一步。

**表示“阶段器”，用来解决控制多个线程分阶段共同完成任务的情景问题.**

**状态：**

- 活跃态（Active）：当存在参与同步的线程的时候，Phaser就是活跃的，并且在每个阶段结束的时候进行同步。
- 终止态（Termination）：当所有参与同步的线程都取消注册的时候，Phaser就处于终止态，在终止状态下，Phaser没有任何参与者。当Phaser对象onAdvance()方法返回True时，Phaser对象就处于终止态。当Phaser处于终止态时，同步方法arriveAndAwaitAdvance()会立即返回，而且不会做任何同步操作。

**主要方法：**

- arrive():这个方法通知phaser对象一个参与者已经完成当前阶段，但是它不应该等待其他参与者都完成当前阶段任务。必须使用这个方法，因为它不会与其他线程同步。
- awaitAdvance(int phase).如果传入的参数与当前阶段一直，这个方法将会将当前线程置于休眠，直到这个阶段的参与者都完成运行。如果传入的阶段参数与当前阶段不一致，立即返回。
- arriveAndAwaitAdvance().当一个线程调用此方法时，Phaser对象将减1，并把这个线程至于休眠状态，直到所有其他线程完成这个阶段。
- arriveAndDeregister().当一个线程调用此方法时，Phaser对象将减1，并且通知这个线程已经完成了当前语句，不会参加到下一个阶段中，因此phaser对象在开始下一个阶段时不会等待这个线程。
- awaitAdvanceInterruptibly(int phase).这个方法跟awaitAdvance(int phase)一样，不同之处是，如果这个方法中休眠的线程被中断，它将抛出InterruptedException异常。
- register()：这个方法将一个新的参与者注册到phaser中，这个新的参与者将被当成没有执行完本阶段的线程。
- bulkRegister(int Parties):这个方法将指定数目的参与者注册到Phaser中，所有的这些参与者都讲被当成没有执行完本阶段的线程。

#### 用法

```java
public class T09_TestPhaser2 {
    static Random r = new Random();
    static MarriagePhaser phaser = new MarriagePhaser();

    static void milliSleep(int milli) {
        try {
            TimeUnit.MILLISECONDS.sleep(milli);
        }
    }

    public static void main(String[] args) {
        phaser.bulkRegister(7);
        for(int i=0; i<5; i++) {
            new Thread(new Person("p" + i)).start();
        }
        new Thread(new Person("新郎")).start();
        new Thread(new Person("新娘")).start();
    }
    static class MarriagePhaser extends Phaser {
        @Override
        protected boolean onAdvance(int phase, int registeredParties) {
            switch (phase) {
                case 0:
                    System.out.println("所有人到齐了！" + registeredParties);
                    System.out.println();
                    return false;
                case 1:
                    System.out.println("所有人吃完了！" + registeredParties);
                    System.out.println();
                    return false;
                case 2:
                    System.out.println("所有人离开了！" + registeredParties);
                    System.out.println();
                    return false;
                case 3:
                    System.out.println("婚礼结束！新郎新娘抱抱！" + registeredParties);
                    return true;
                default:
                    return true;
            }
        }
    }
    static class Person implements Runnable {
        String name;
        public Person(String name) {
            this.name = name;
        }
        public void arrive() {
            milliSleep(r.nextInt(1000));
            System.out.printf("%s 到达现场！\n", name);
            phaser.arriveAndAwaitAdvance();
        }
        public void eat() {
            milliSleep(r.nextInt(1000));
            System.out.printf("%s 吃完!\n", name);
            phaser.arriveAndAwaitAdvance();
        }
        public void leave() {
            milliSleep(r.nextInt(1000));
            System.out.printf("%s 离开！\n", name);
            phaser.arriveAndAwaitAdvance();
        }
        private void hug() {
            if(name.equals("新郎") || name.equals("新娘")) {
                milliSleep(r.nextInt(1000));
                System.out.printf("%s 洞房！\n", name);
                phaser.arriveAndAwaitAdvance();
            } else {
                phaser.arriveAndDeregister();
                //phaser.register()
            }
        }
        @Override
        public void run() {
            arrive();
            eat();
            leave();
            hug();
        }
    }
}
```

**运行结果**

> p4 到达现场！
> …
> p0 到达现场！
> 新郎 到达现场！
> 新娘 到达现场！
> 所有人到齐了！7
>
> p2 吃完!
> p1 吃完!
> p4 吃完!
> 新郎 吃完!
> p0 吃完!
> 新娘 吃完!
> p3 吃完!
> 所有人吃完了！7
>
> p3 离开！
> p4 离开！
> 新娘 离开！
> 新郎 离开！
> p2 离开！
> p0 离开！
> p1 离开！
> 所有人离开了！7
>
> 新娘 洞房！
> 新郎 洞房！
> 婚礼结束！新郎新娘抱抱！2

### ReadWriteLock

**链接：** https://www.cnblogs.com/xiaoxi/p/9140541.html

#### 读写锁简介

  现实中有这样一种场景：对共享资源有读和写的操作，且写操作没有读操作那么频繁。在没有写操作的时候，多个线程同时读一个资源没有任何问题，所以应该允许多个线程同时读取共享资源；但是如果一个线程想去写这些共享资源，就不应该允许其他线程对该资源进行读和写的操作了。

　针对这种场景，**JAVA的并发包提供了读写锁ReentrantReadWriteLock，它表示两个锁，一个是读操作相关的锁，称为共享锁；一个是写相关的锁，称为排他锁**，描述如下：

- 线程进入读锁的前提条件：
- 没有其他线程的写锁，
- 没有写请求或者**有写请求，但调用线程和持有锁的线程是同一个。**

线程进入写锁的前提条件：
- 没有其他线程的读锁
- 没有其他线程的写锁

而读写锁有以下三个重要的特性：

（1）公平选择性：支持非公平（默认）和公平的锁获取方式，吞吐量还是非公平优于公平。

（2）重进入：读锁和写锁都支持线程重进入。

（3）锁降级：遵循获取写锁、获取读锁再释放写锁的次序，写锁能够降级成为读锁。

#### 用法

```java
static Lock lock = new ReentrantLock();
private static int value;
static ReadWriteLock readWriteLock = new ReentrantReadWriteLock();
static Lock readLock = readWriteLock.readLock();
static Lock writeLock = readWriteLock.writeLock();
public static void read(Lock lock) {
    try {
        lock.lock();
        Thread.sleep(1000);
        System.out.println("read over!");
        //模拟读取操作
    } catch (InterruptedException e) {
        e.printStackTrace();
    } finally {
        lock.unlock();
    }
}
public static void write(Lock lock, int v) {
    try {
        lock.lock();
        Thread.sleep(1000);
        value = v;
        System.out.println("write over!");
        //模拟写操作
    } catch (InterruptedException e) {
        e.printStackTrace();
    } finally {
        lock.unlock();
    }
}
public static void main(String[] args) {
    //Runnable readR = ()-> read(lock);
    Runnable readR = ()-> read(readLock);
    //Runnable writeR = ()->write(lock, new Random().nextInt());
    Runnable writeR = ()->write(writeLock, new Random().nextInt());
    for(int i=0; i<18; i++) new Thread(readR).start();
    for(int i=0; i<2; i++) new Thread(writeR).start();
}
```

> 结果：
>
> read over!
> … …
> read over!
> write over!
> write over!

**分析：** ReentrantReadWriteLock 对于读操作实现共享锁，线程在*读操作时多线程可以快速获取数据，不用等待其它锁的进入* ，在进行*写操作时进行加锁操作不允许其它线程进行读写操作，提高的运行的效率。*

### Semaphore

**介绍：**

　Semaphore也是一个线程同步的辅助类，可以维护当前访问自身的线程个数，并提供了同步机制。使用Semaphore可以控制同时访问资源的线程个数，例如，实现一个文件允许的并发访问数。

Semaphore的主要方法摘要：

　　void acquire(): 从此信号量获取一个许可，在提供一个许可前一直将线程阻塞，否则线程被中断。

　　void release(): 释放一个许可，将其返回给信号量。

　　int availablePermits(): 返回此信号量中当前可用的许可数。

　　boolean hasQueuedThreads(): 查询是否有线程正在等待获取。

#### 用法

```java
public static void main(String[] args) {
    //Semaphore s = new Semaphore(2);
    Semaphore s = new Semaphore(2, true);
    //允许一个线程同时执行
    //Semaphore s = new Semaphore(1);
    new Thread(()->{
        try {
            s.acquire();
            System.out.println("T1 running...");
            Thread.sleep(200);
            System.out.println("T1 running...");
        } catch (InterruptedException e) {
            e.printStackTrace();
        } finally {
            s.release();
        }
    }).start();
    new Thread(()->{
        try {
            s.acquire();
            System.out.println("T2 running...");
            Thread.sleep(200);
            System.out.println("T2 running...");
            s.release();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }).start();
}
```

> T1 running...
> T2 running...
> T1 running...
> T2 running...

**Tip:**  单个信号量的Semaphore对象可以实现互斥锁的功能，并且可以是由一个线程获得了“锁”，再由另一个线程释放“锁”，这可应用于死锁恢复的一些场合。

### Exchanger

Exchanger用于线程间进行通信、数据交换。Exchanger提供了一个同步点exchange方法，两个线程调用exchange方法时，无论调用时间先后，两个线程会互相等到线程到达exchange方法调用点，此时两个线程可以交换数据，将本线程产出数据传递给对方。

#### 用法

```java
static Exchanger<String> exchanger = new Exchanger<>();
public static void main(String[] args) {
    new Thread(()->{
        String s = "T1";
        try {
            s = exchanger.exchange(s);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        System.out.println(Thread.currentThread().getName() + " " + s);
    }, "t1").start();
    new Thread(()->{
        String s = "T2";
        try {
            s = exchanger.exchange(s);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        System.out.println(Thread.currentThread().getName() + " " + s);
    }, "t2").start();
}
```

> 结果：
>
> t1 T2
> t2 T1

Exchanger 初步实验结果可以看出,可以实现线程之间进行值传递，**这里需要注意的是它是按照线程依次进入的顺序，相邻两个线程进行值传递，第三个线程进来会等待第四个线程，然后进行值传递**

### LockSupport

用来创建锁和其他同步类的基本线程阻塞原语。

LockSupport类的核心方法其实就两个：`park()`和`unpark()`，其中`park()`方法用来阻塞当前调用线程，`unpark()`方法用于唤醒指定线程。

LockSupport类使用了一种名为Permit（许可）的概念来做到阻塞和唤醒线程的功能，可以把许可看成是一种(0,1)信号量（Semaphore），但与 Semaphore 不同的是，许可的累加上限是1。
初始时，permit为0，当调用`unpark()`方法时，线程的permit加1，当调用`park()`方法时，如果permit为0，则调用线程进入阻塞状态

#### 使用

```java
public static void main(String[] args) {
    Thread t = new Thread(()->{
        for (int i = 0; i < 10; i++) {
            System.out.println(i);
            if(i == 5) {
                LockSupport.park();
            }
            try {
                TimeUnit.SECONDS.sleep(1);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    });
    t.start();
    LockSupport.unpark(t);
     try {
        TimeUnit.SECONDS.sleep(10);
    } catch (InterruptedException e) {
        e.printStackTrace();
    }
    System.out.println("after 8 senconds!");
    LockSupport.unpark(t);
}
```

> 0
> … …
> 7
> after 8 senconds!
> 8
> 9



### ThreadLocal 局部变量

- ThreadLocal是使用空间换时间，synchronized是使用时间换空间
- 比如在hibernate中session就存在与ThreadLocal中，避免synchronized的使用

```java
//volatile static Person p = new Person();
volatile static ThreadLocal<Person> tl = new ThreadLocal<>();
public static void main(String[] args) {
    new Thread(()->{
        try {
            TimeUnit.SECONDS.sleep(3);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        System.out.println(tl.get());
    }).start();
    new Thread(()->{
        try {
            TimeUnit.SECONDS.sleep(1);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        tl.set(new Person());
    }).start();
}
static class Person {
    String name = "zhangsan";
}
```

```java
public class ThreadLocalTest {
    static ThreadLocal<String> localVar = new ThreadLocal<>();
    static void print(String str) {
        System.out.println(str + " :" + localVar.get());//打印当前线程中本地内存中本地变量的值
        localVar.remove(); //清除本地内存中的本地变量
    }
    public static void main(String[] args) {
        Thread t1  = new Thread(new Runnable() {
            @Override
            public void run() {
                localVar.set("localVar1"); //设置线程1中本地变量的值
                print("thread1"); //调用打印方法
                System.out.println("after remove : " + localVar.get()); //打印本地变量
            }
        });

        Thread t2  = new Thread(new Runnable() {
            @Override
            public void run() {
                localVar.set("localVar2"); //设置线程1中本地变量的值
                print("thread2"); //调用打印方法
                System.out.println("after remove : " + localVar.get()); //打印本地变量
            }
        });
        t1.start();
        t2.start();
    }
}
结果：
    thread1: localVar1
    after remove : null
    thread2: localVar2
    after remove : null
```



## 同步容器类

概括：

​	1：Vector Hashtable ：早期使用synchronized实现
​	2：ArrayList HashSet ：未考虑多线程安全（未实现同步）
​	3：HashSet vs Hashtable StringBuilder vs StringBuffer
​	4：Collections.synchronized***工厂方法使用的也是synchronized

使用早期的同步容器以及Collections.synchronized***方法的不足之处，请阅读：
http://blog.csdn.net/itm_hadf/article/details/7506529

使用新的并发容器
http://xuganggogo.iteye.com/blog/321630

### 火车票售票问题

#### synchronized

```java
public class TicketSeller3 {
    static List<String> tickets = new LinkedList<>();
    static {
        for(int i=0; i<1000; i++) tickets.add("票 编号：" + i);
    }
    public static void main(String[] args) {
        for(int i=0; i<10; i++) {
            new Thread(()->{
                while(true) {
                    synchronized(tickets) {
                        if(tickets.size() <= 0) break;
                        try {
                            TimeUnit.MILLISECONDS.sleep(10);
                        } catch (InterruptedException e) {
                            e.printStackTrace();
                        }
						System.out.println("销售了--" + tickets.remove(0)+", "+Thread.currentThread().getName());
                    }
                }
            },"thread-"+i).start();
        }
    }
}
```

#### ConcurrentLinkedQueue

```java
public class TicketSeller4 {
    static Queue<String> tickets = new ConcurrentLinkedQueue<>();
    static {
        for(int i=0; i<1000; i++) tickets.add("票 编号：" + i);
    }
    public static void main(String[] args) {
        for(int i=0; i<10; i++) {
            new Thread(()->{
                while(true) {
                    String s = tickets.poll();
                    if(s == null) break;
                    else 
                System.out.println(Thread.currentThread().getName()+" , 销售了--" + s);
                }
            },"thread-"+i).start();
        }
    }
}
```

总结：

使用synchronized关键字可以实现线程之间的同步，但是使用ConcurrentLinkedQueue并发容器的效率更高



### map 和 set

#### Hashtable 和 HashMap

（1）区别，这两个类主要有以下几方面的不同：
Hashtable和HashMap都实现了Map接口，但是Hashtable的实现是基于Dictionary抽象类。

```java
public class HashMap<K,V> extends AbstractMap<K,V>
    implements Map<K,V>, Cloneable, Serializable 
    
public class Hashtable<K,V> extends Dictionary<K,V>
    implements Map<K,V>, Cloneable, java.io.Serializable
```

在HashMap中，null可以作为键，这样的键只有一个；可以有一个或多个键所对应的值为null。 
当get()方法返回null值时，即可以表示 HashMap中没有该键，也可以表示该键所对应的值为null。
 因此，在HashMap中不能由get()方法来判断HashMap中是否存在某个键，而应该用containsKey()方法来判断。
 而在Hashtable中，无论是key还是value都不能为null 。

   这两个类最大的不同在于：
（1）Hashtable是线程安全的，它的方法是同步了的，可以直接用在多线程环境中。
（2）而HashMap则不是线程安全的。在多线程环境中，需要手动实现同步机制。

因此，在Collections类中提供了一个方法返回一个同步版本的HashMap用于多线程的环境： `synchronizedMap`

在进行迭代时这个问题更改明显。Map集合共提供了三种方式来分别返回键、值、键值对的集合：
Java代码
Set<K> keySet()；  
Collection<V> values()；  
Set<Map.Entry<K,V>> entrySet()；  

 在这三个方法的基础上，我们一般通过如下方式访问Map的元素：
Java代码
Iterator keys = map.keySet().iterator();  

while(keys.hasNext()){  
    map.get(keys.next());  
}  

在这里，有一个地方需要注意的是：得到的keySet和迭代器都是Map中元素的一个“视图”，而不是“副本” 。
问题也就出现在这里，当一个线程正在迭代Map中的元素时，另一个线程可能正在修改其中的元素。
此时，在迭代元素时就可能会抛出 **ConcurrentModificationException**异常。

为了解决这个问题通常有两种方法，
（1）一是直接返回元素的副本，而不是视图。这个可以通过
集合类的 toArray() 方法实现，但是创建副本的方式效率比之前有所降低，
特别是在元素很多的情况下；
（2）另一种方法就是在迭代的时候锁住整个集合，这样的话效率就更低了。

更好的选择：`ConcurrentHashMap`

java5中新增了ConcurrentMap接口和它的一个实现类ConcurrentHashMap。
ConcurrentHashMap提供了和Hashtable以及SynchronizedMap中所不同的锁机制。
Hashtable中采用的锁机制是一次锁住整个hash表，从而同一时刻只能由一个线程对其进行操作；
而ConcurrentHashMap中则是一次锁住一个桶。
ConcurrentHashMap默认将hash表分为16个桶，诸如get,put,remove等常用操作只锁当前需要用到的桶。
这样，原来只能一个线程进入，现在却能同时有16个写线程执行，并发性能的提升是显而易见的。

上面说到的16个线程指的是写线程，而读操作大部分时候都不需要用到锁。只有在size等操作时才需要锁住整个hash表。

在迭代方面，ConcurrentHashMap使用了一种不同的迭代方式。
在这种迭代方式中，当iterator被创建后集合再发生改变就不再是抛出ConcurrentModificationException，
取而代之的是  在改变时new新的数据从而不影响原有的数据 。
iterator完成后再将头指针替换为新的数据 。
这样iterator线程可以使用原来老的数据。而写线程也可以并发的完成改变。

#### LinkedHashMap

HashMap和双向链表合二为一即是LinkedHashMap。

[博客：]: https://blog.csdn.net/justloveyou_/article/details/71713781?ops_request_misc=%257B%2522request%255Fid%2522%253A%2522162398270716780271521376%2522%252C%2522scm%2522%253A%252220140713.130102334..%2522%257D&amp;request_id=162398270716780271521376&amp;biz_id=0&amp;utm_medium=distribute.pc_search_result.none-task-blog-2~all~top_positive~default-1-71713781.first_rank_v2_pc_rank_v29&amp;utm_term=LinkedHashMap&amp;spm=1018.2226.3001.4187	" LinkedHashMap 详解"

https://blog.csdn.net/u012860938/article/details/95613684?ops_request_misc=%257B%2522request%255Fid%2522%253A%2522162398270716780271521376%2522%252C%2522scm%2522%253A%252220140713.130102334..%2522%257D&request_id=162398270716780271521376&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~top_click~default-2-95613684.first_rank_v2_pc_rank_v29&utm_term=LinkedHashMap&spm=1018.2226.3001.4187

#### TreeMap 

TreeMap 是一个**有序的key-value集合**，它是通过[红黑树](http://www.cnblogs.com/skywang12345/p/3245399.html)实现的。
TreeMap 继承于AbstractMap，所以它是一个Map，即一个key-value集合。
TreeMap 实现了NavigableMap接口，意味着它支持一系列的导航方法。比如返回有序的key集合。
TreeMap 实现了Cloneable接口，意味着它能被克隆。
TreeMap 实现了java.io.Serializable接口，意味着它支持序列化。

TreeMap基于红黑树（Red-Black tree）实现。该映射根据其键的自然顺序进行排序，或者根据创建映射时提供的 Comparator 进行排序，具体取决于使用的构造方法。
TreeMap的基本操作 containsKey、get、put 和 remove 的时间复杂度是 log(n) 。
另外，TreeMap是非同步的。 它的iterator 方法返回的迭代器是fail-fastl的。

https://blog.csdn.net/yo_bc/article/details/79316724?ops_request_misc=&request_id=&biz_id=102&utm_term=TreeMap%20&utm_medium=distribute.pc_search_result.none-task-blog-2~all~sobaiduweb~default-5-.first_rank_v2_pc_rank_v29&spm=1018.2226.3001.4187

#### ConcurrentHashMap 

ConcurrentHashMap是J.U.C(java.util.concurrent包)的重要成员，它是HashMap的一个线程安全的、支持高效并发的版本。在默认理想状态下，ConcurrentHashMap可以支持16个线程执行并发写操作及任意数量线程的读操作。

在多线程环境下，操作HashMap会导致各种各样的线程安全问题，比如在HashMap扩容重哈希时出现的死循环问题，脏读问题等。

总的来说，ConcurrentHashMap的高效并发机制是通过以下三方面来保证的(具体细节见后文阐述)：

通过锁分段技术保证并发环境下的写操作；

通过 HashEntry的不变性、Volatile变量的内存可见性和加锁重读机制保证高效、安全的读操作；

通过不加锁和加锁两种方案控制跨段操作的的安全性。



#### ConcurrentSkipListMap

SkipList（跳表）查找的过程如下图：

![img](img/20160820160528302)

其实，上面基本上就是跳跃表的思想，每一个结点不单单只包含指向下一个结点的指针，可能包含很多个指向后续结点的指针，这样就可以跳过一些不必要的结点，从而加快查找、删除等操作。对于一个链表内每一个结点包含多少个指向后续元素的指针，后续节点个数是通过一个随机函数生成器得到，这样子就构成了一个跳跃表。

随机生成的跳跃表可能如下图所示：

![img](img/20160820160628076)

跳跃表其实也是一种通过“**空间来换取时间**”的一个算法，通过在每个节点中增加了向前的指针，从而提升查找的效率。

“Skip lists are data structures  that use probabilistic  balancing rather  than  strictly  enforced balancing. As a result, the algorithms  for insertion  and deletion in skip lists  are much simpler and significantly  faster  than  equivalent  algorithms  for balanced trees.  ”
译文：跳跃表使用**概率均衡技术**而不是使用强制性均衡技术，**因此，对于插入和删除结点比传统上的平衡树算法更为简洁高效。** 

跳表是一种随机化的数据结构，目前开源软件 Redis 和 LevelDB 都有用到它。

### 队列

#### ArrayList 和 LinkedList

1.ArrayList类提供了List ADT的一种可增长数组的实现。使用ArrayList的优点在于，对get和set的调用花费常数时间。其缺点是新项的插入和现有项的删除代价昂贵，除非变动是在ArrayList的末端是在ArrayList的末端运行。**ArrayList是基于数组实现的**

2.LinkedList类则提供了List ADT的双链表实现。使用LinkedList的优点在于，新项的插入和现有项的删除均开销很小，这里假设变动项的位置是已知的。

#### CopyOnWriteList

**概述**

**CopyOnWriteList** 是一个写时复制的策略保证 list 的一致性，所以在其增删改的操作中都使用了独占锁 ReentrantLock 来保证某个时间只有一个线程能对 list 数组进行修改。其底层是对数组的修改，调用 **Arrays.copyarray()** 方法进行对数组的复制，在底层还是调用的 C++ 去进行的数组的复制 **System.copyarray()**

**修改**
在修改时如果需要修改的元素和之前元素值相同，会调用 setAarray(elements) 方法将之前的数组又塞回去，看似很多余，其实之中暗藏玄机。 array 字段是被 volutile 修饰，所以调用 setArray() 方法会是缓存行内的 array 字段缓存失败，并防止指令重拍，即 happens-before 原理

**弱一致性的迭代器**
当调用迭代器 iterator() 方法时，实际上会返回一个 COWIterator 对象，COWIterator 对象会拿到当前的 array 保存在 snapshot 变量中，cursor 是遍历的游标。

虽然 snapshot 是指针引用，但是，叫快照不符合语义，但是在对 list 进行增删改操作时，其实是操作的是复制出来的新数组，所以 snapshot 不会改变，所以其迭代器是弱一致性的。

#### Queue

##### CocurrentLinkedQueue 

线程安全的队列可以分为阻塞队列与非阻塞队列，其中，阻塞队列的典型例子就是LinkedBlockingQueue，非阻塞队列的典型例子就是ConcurrentLinkedQueue。在实际应用中，应根据两者的特点，灵活地进行选择。

ConcurrentLinkedQueue是一个线程安全的非阻塞队列，基于链表实现。java并没有提供构造方法来指定队列的大小，因此它是无界的。为了提高并发量，它通过使用更细的锁机制，使得在多线程环境中只对部分数据进行锁定，从而提高运行效率。

###### 与LinkedBlockingQueue比较

LinkedBlockingQueue是一个线程安全的阻塞队列，基于链表实现，一般用于生产者与消费者模型的开发中。采用锁机制来实现多线程同步，提供了一个构造方法用来指定队列的大小，如果不指定大小，队列采用默认大小（Integer.MAX_VALUE，即整型最大值）。

##### ConcurrentArrayQueue

**ConcurrentLinkedQueue**:可以看做是一个线程安全的LinkedList，适用于许多线程共享访问一个公共集合，是一个基于链接节点的无界线程安全队列，它采用先进先出的规则对节点进行排序，当我们添加一个元素的时候，它会添加到队列的尾部；当我们获取一个元素时，它会返回队列头部的元素。它采用了“wait-free”算法（即CAS算法）来实现。

**常用方法:**

- boolean add(E e):将元素e插入到队列末尾，插入成功，则返回true；插入失败（即队列已满），返回false；
- boolean offer(E e)将元素e插入到队列末尾，插入成功，则返回true；插入失败（即队列已满），返回false；和add一样
- E peek():    获取但不移除此队列的头；如果此队列为空，则返回 null。
- E poll():获取队首元素并移除，若队列不为空，则返回队首元素；否则返回null；
- boolean remove(Object o):从队列中移除指定元素的单个实例（如果存在）。

##### BlockingQueue

在所有的并发容器中，BlockingQueue是最常见的一种。BlockingQueue是一个带阻塞功能的队列，当入队列时，若队列已满，则阻塞调用者；当出队列时，若队列为空，则阻塞调用者。

###### ArrayBlockingQueue

​    基于数组的阻塞队列实现，在ArrayBlockingQueue内部，维护了一个定长数组，以便缓存队列中的数据对象，这是一个常用的阻塞队列，除了一个定长数组外，ArrayBlockingQueue内部还保存着两个整形变量，分别标识着队列的头部和尾部在数组中的位置。
　　ArrayBlockingQueue在生产者放入数据和消费者获取数据，都是共用同一个锁对象，由此也意味着两者无法真正并行运行，这点尤其不同于LinkedBlockingQueue；按照实现原理来分析，ArrayBlockingQueue完全可以采用分离锁，从而实现生产者和消费者操作的完全并行运行。Doug Lea之所以没这样去做，也许是因为ArrayBlockingQueue的数据写入和获取操作已经足够轻巧，以至于引入独立的锁机制，除了给代码带来额外的复杂性外，其在性能上完全占不到任何便宜。 ArrayBlockingQueue和LinkedBlockingQueue间还有一个明显的不同之处在于，前者在插入或删除元素时不会产生或销毁任何额外的对象实例，而后者则会生成一个额外的Node对象。这在长时间内需要高效并发地处理大批量数据的系统中，其对于GC的影响还是存在一定的区别。而在创建ArrayBlockingQueue时，我们还可以控制对象的内部锁是否采用公平锁，默认采用非公平锁。

###### LinkedBlockingQueue

​    基于链表的阻塞队列，同ArrayListBlockingQueue类似，其内部也维持着一个数据缓冲队列（该队列由一个链表构成），当生产者往队列中放入一个数据时，队列会从生产者手中获取数据，并缓存在队列内部，而生产者立即返回；只有当队列缓冲区达到最大值缓存容量时（LinkedBlockingQueue可以通过构造函数指定该值），才会阻塞生产者队列，直到消费者从队列中消费掉一份数据，生产者线程会被唤醒，反之对于消费者这端的处理也基于同样的原理。而LinkedBlockingQueue之所以能够高效的处理并发数据，还因为其对于生产者端和消费者端分别采用了独立的锁来控制数据同步，这也意味着在高并发的情况下生产者和消费者可以并行地操作队列中的数据，以此来提高整个队列的并发性能。
作为开发者，我们需要注意的是，如果构造一个LinkedBlockingQueue对象，而没有指定其容量大小，LinkedBlockingQueue会默认一个类似无限大小的容量（Integer.MAX_VALUE），这样的话，如果生产者的速度一旦大于消费者的速度，也许还没有等到队列满阻塞产生，系统内存就有可能已被消耗殆尽了。

ArrayBlockingQueue和LinkedBlockingQueue是两个最普通也是最常用的阻塞队列，一般情况下，在处理多线程间的生产者消费者问题，使用这两个类足以。

##### TransferQueue

传输队列接口

https://blog.csdn.net/qq_34924288/article/details/116212625?ops_request_misc=%257B%2522request%255Fid%2522%253A%2522162399944516780274132315%2522%252C%2522scm%2522%253A%252220140713.130102334.pc%255Fall.%2522%257D&request_id=162399944516780274132315&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~first_rank_v2~times_rank-2-116212625.first_rank_v2_pc_rank_v29&utm_term=TransferQueue&spm=1018.2226.3001.4187

TransferQueue接口继承自BlockingQueue接口，因此有常规阻塞队列的所有操作。
区别于常规的阻塞队列，提供了一种适用于“生产者”、“消费者”模式的传输队列。考虑以下几个场景：

1. 容器为空，消费者先到并因为当前无数据而阻塞，此时生产者到达并生产数据，从而消费者能消费数据，返回“传输成功(true)”；——tryTransfer(E e)
2. 容器为空，生产者先到并尝试生产数据，但当前没有消费者阻塞等待数据，生产者立马放弃传输，返回“传输失败(false)”； ——tryTransfer(E e)
3. 容器为空，此时生产者到达并尝试生产数据，由于当前没有消费者，生产者（有限时间内）阻塞。在有限时间内如果有消费者到达接收数据，返回“传输成功”，否则返回“传输失败”。——tryTransfer(E e, long timeout, TimeUnit unit)
4. 容器为空，此时生产者到达并尝试生产数据，由于当前没有消费者，生产者（无限）阻塞，直到消费者到达并消费数据。 ——transfer(E e)

##### SynchronusQueue

同步队列

原理分析
SynchronouseQueue提供了两种策略方式：

非公平策略（默认） - 基于栈方式，LIFO后进先出。
公平策略 - 基于队列方式，FIFO先进先出。
SynchronouseQueue核心方法在于两个内部类对抽象方法 transfer(E e, boolean timed, long nanos)的实现。

##### DelayQueue执行定时任务

是一种延迟队列，意思是延迟执行，并且可以设置延迟多久之后执行，比如设置过 5 秒钟之后再执行，在一些延迟执行的场景被大量使用，比如说延迟对账等等。

https://blog.csdn.net/zlfing/article/details/109237305?ops_request_misc=%257B%2522request%255Fid%2522%253A%2522162399967216780255282463%2522%252C%2522scm%2522%253A%252220140713.130102334.pc%255Fall.%2522%257D&request_id=162399967216780255282463&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~first_rank_v2~times_rank-1-109237305.first_rank_v2_pc_rank_v29&utm_term=DelayQueue&spm=1018.2226.3001.4187

DelayQueue 是非常有意思的队列，底层使用了排序和超时阻塞实现了延迟队列，排序使用的是 PriorityQueue 排序能力，超时阻塞使用得是锁的等待能力，可以看出 DelayQueue 其实就是为了满足延迟执行的场景，在已有 API 的基础上进行了封装，我们在工作中，可以学习这种思想，对已有的功能能复用的尽量复用，减少开发的工作量。







