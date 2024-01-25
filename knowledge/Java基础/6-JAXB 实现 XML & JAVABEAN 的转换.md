

[博客：JAXB 注解详解](https://blog.csdn.net/momoyiye/article/details/51388345?ops_request_misc=&request_id=&biz_id=102&utm_term=%E4%BD%BF%E7%94%A8JAXB%E8%BF%9B%E8%A1%8CXML%E4%B8%8EJavaBean%E7%9A%84%E8%BD%AC%E6%8D%A2&utm_medium=distribute.pc_search_result.none-task-blog-2~all~sobaiduweb~default-2-51388345.first_rank_v2_pc_rank_v29&spm=1018.2226.3001.4187)

## 一 前言

集成接口项目的开发，与第三方系统或中间平台等进行交互，支持服务端&客户端，支持 http/ https/ Webservice 等多种交互方式，数据传输主要采用XML（部分可能会在XML中以<![CDATA[......]]> 的形式包裹 JSON字符串），以后也可能会采用 JSON 格式。鉴于功能需要，必然要将XML传输的数据转换为JAVA对象来进行数据的处理，以及将JAVA对象转换为XML作为报文进行传输，因此，给出以下方案：利用JAXB技术来实现JAVA对象与XML的自由转换，以及对<![CDATA[......]]> 内容的处理。

根据业务与需求的复杂程度，本文中所列解决方案不能全部覆盖，因此会在今后进行补充。



## 二 JAXB概述

> ​        JAXB（Java Architecture for XML Binding) 是一个业界标准，是可根据XML Schema产生Java类的技术。同时，JAXB不仅提供了将XML反向生成Java对象树的方法，而且能将Java对象树重新写到 XML文档，实现Java对象与XML的互相转换。
> ​       Jaxb 2.0是JDK 1.6的组成部分，无需引入第三方jar包。Jaxb2.0使用了JDK的新特性，如：Annotation、泛型（GenericType）等

 **重要概念:**
 JAXBContext类，是应用的入口，用于管理XML/Java绑定信息。
 Marshaller接口，将Java对象序列化为XML数据。
 Unmarshaller接口，将XML数据反序列化为Java对象。

**常用注解(annotation):**
 **@XmlType**，将Java类或枚举类型映射到XML Schema Type
 **@XmlAccessorType(XmlAccessType.FIELD)** ，控制字段或属性的序列化。FIELD表示JAXB将自动绑定Java类中的每个非静态的（non-static）、非瞬态的（由@XmlTransient标注）字段到XML。其他值还有XmlAccessType.PROPERTY和XmlAccessType.NONE 等。
 **@XmlAccessorOrder**，控制JAXB 绑定类中属性和字段的排序。
 @XmlJavaTypeAdapter，使用定制的适配器（即扩展抽象类XmlAdapter并覆盖marshal()和unmarshal()方法），以序列化Java类为XML。
 **@XmlElementWrapper** ，对于数组或集合（即包含多个元素的成员变量），生成一个包装该数组或集合的XML元素（称为包装器）。
 **@XmlRootElement**，将Java类或枚举类型映射到XML元素。
 **@XmlElement**，将Java类的一个属性映射到与属性同名的一个XML元素。
 **@XmlAttribute**，将Java类的一个属性映射到与属性同名的一个XML属性。