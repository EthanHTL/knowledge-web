# Lombok

[TOC]

## 注解

- val: final 像动态语言一样，声明一个fianl的变量。
- var: 同JDK10
- @Data：注解在类上，将类提供的所有属性都添加get、set方法，并添加、equals、canEquals、hashCode、toString方法
- @Setter：注解在类上，为所有属性添加set方法、注解在属性上为该属性提供set方法
- @Getter：注解在类上，为所有的属性添加get方法、注解在属性上为该属性提供get方法
- @NotNull：在参数中使用时，如果调用时传了null值，就会抛出空指针异常
- @Synchronized 用于方法，可以锁定指定的对象，如果不指定，则默认创建一个对象锁定
- @Log作用于类，创建一个log属性
- @Builder：使用builder模式创建对象
- @NoArgsConstructor：创建一个无参构造函数
- @AllArgsConstructor：创建一个全参构造函数
- @ToString：创建一个toString方法
- @Accessors(chain = true)使用链式设置属性，set方法返回的是this对象。
- @RequiredArgsConstructor：创建对象, 例: 在class上添加- - 
- @RequiredArgsConstructor(staticName = "of")会创建生成一个静态方法
- @UtilityClass:工具类
- @ExtensionMethod:设置父类
- @FieldDefaults：设置属性的使用范围，如private、public等，也可以设置属性是否被final修饰。
- @Cleanup: 关闭流、连接点。
- @EqualsAndHashCode：重写equals和hashcode方法。
- @toString：创建toString方法。
- @Cleanup: 用于流等可以不需要关闭使用流对象.

## 示例

### @Accessors(chain = true)：使用链式创建:

```java
@Setter
@Getter
@Accessors(chain = true)
public class User {
    private String id;
    private String name;
    private Integer age;
}
 
public static void main(String[] args) {
    //使用@Accessors(chain = true)
    User userChain = new User();
    userChain.setId("1").setName("chain").setAge(1);
}
```

### @Builder：使用builder模式创建对象

```java
@Setter
@Getter
@Builder
public class User {
    private String id;
    private String name;
    private Integer age;
}
 
public static void main(String[] args) {
    User user = User.builder().id("1").name("builder").age(1).build();
    System.out.println(user.getId());
}
```

### @UtilityClass：工具类注解

```java
@UtilityClass
public class Utility {
 
    public String getName() {
        return "name";
    }
}
 
public static void main(String[] args) {
    // Utility utility = new Utility(); 构造函数为私有的,
    System.out.println(Utility.getName());
 
}
```

### @CleanUp: 清理流对象

```java
@Cleanup
OutputStream outStream = new FileOutputStream(new File("text.txt"));
@Cleanup
InputStream inStream = new FileInputStream(new File("text2.txt"));
byte[] b = new byte[65536];
while (true) {
   int r = inStream.read(b);
   if (r == -1) break;
   outStream.write(b, 0, r); 
}
```

