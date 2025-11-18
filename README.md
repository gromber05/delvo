# 🧠 Delvo - Asistente Personal Inteligente Multiplataforma

Delvo consiste en el desarrollo de un **Asistente Personal Inteligente**, diseñado para ayudar a los usuarios a organizar su día a día mediante la gestión de tareas, recordatorios, eventos, notas y rutinas.  
Incluye **Aplicación Móvil**, **Aplicación Web** y **Backend**, además de un módulo de **Inteligencia Artificial** que mejora la toma de decisiones del usuario.

Este sistema pretende combinar productividad, simplicidad y automatización de rutinas mediante IA, integrando datos entre plataformas de forma segura.

---

## 🚀 Características principales

### 🔹 Aplicación Móvil (Android – Jetpack Compose)
- Vista *“Hoy”* con recomendaciones generadas por IA  
- Lista de tareas con prioridades y categorías  
- Creación rápida de tareas por texto  
- Notas rápidas  
- Recordatorios inteligentes  
- Navegación inferior (Hoy, Tareas, Calendario, Perfil)  
- Sincronización con backend en tiempo real

---

### 🔹 Aplicación Web (Angular/React)
- Dashboard principal de productividad  
- Estadísticas y gráficas: tareas completadas, hábitos, rachas  
- Calendario semanal/mensual  
- Gestor avanzado de tareas  
- Panel de notas  
- Resúmenes semanales generados por IA  
- Configuraciones del perfil y ajustes de IA

---

### 🔹 Backend (Spring Boot + Kotlin)
- API REST para móvil y web  
- Seguridad con JWT  
- Gestión de usuarios, tareas, notas, recordatorios y rutinas  
- PostgreSQL como base de datos  
- Sincronización entre dispositivos  
- Servicio de IA integrado  
- Generador de resúmenes y sugerencias

---

### 🤖 Módulo IA
El asistente cuenta con varias funciones inteligentes:

- **Clasificación automática de tareas**  
  La IA detecta categoría, prioridad y fecha sugerida según la descripción.

- **Organización semanal inteligente**  
  Sugiere un planning según hábitos del usuario.

- **Resumen diario/semanal**  
  Informa al usuario sobre su productividad y recomendaciones.

- **Detección de patrones y hábitos**  
  Identifica momentos del día donde el usuario rinde más.

- **Recordatorios inteligentes**  
  Basados en contexto y comportamiento.

---

## 🧱 Arquitectura del proyecto

La estructura del repositorio sigue un formato **monorepo**, donde cada módulo se encuentra dentro de su propia carpeta:

````

delvo/
│
├─ backend/              # Proyecto Spring Boot + Kotlin
│
├─ mobile/               # Aplicación Android (Jetpack Compose)
│
├─ web/                  # Aplicación Web (Angular o React)
│
└─ docs/                 # Documentación, diagramas, memoria, presentación

````

---

## 🛠️ Tecnologías utilizadas

### 📱 Mobile
- Kotlin  
- Jetpack Compose  
- Hilt  
- ViewModel + Flow  
- Retrofit  
- Navigation Compose  

### 🌐 Web
- Angular o React (a elección)  
- Material UI / TailwindCSS  
- Chart.js / Recharts para gráficas  
- JWT Auth  

### ⚙️ Backend
- Spring Boot (Kotlin)  
- PostgreSQL  
- JPA / Hibernate  
- Spring Security + JWT  
- OpenAPI/Swagger  
- Servicio interno de IA  

### 🤖 Inteligencia Artificial
- NLP ligero para clasificación  
- Reglas + heurísticas  
- Algoritmos de análisis de hábitos  
- Microservicio opcional externo

---

## 📊 Flujo general del sistema

1. El usuario crea tareas/notas/eventos desde móvil o web  
2. El backend procesa la información y actualiza la BD  
3. El módulo IA analiza comportamiento y genera sugerencias  
4. Las apps muestran recomendaciones personalizadas  
5. La web ofrece un dashboard avanzado con datos históricos  

---

## 🎨 Capturas de pantalla (opcional)
> *(Aquí puedes añadir imágenes una vez que vayas avanzando)*

---

## 📄 Documentación

La carpeta `docs/` contiene:

- Índice de la memoria  
- Diagramas de arquitectura  
- Diagramas UML  
- Esquemas de la BD  
- Prototipos y mockups  
- Guía de instalación  
- Información para el tribunal del TFG  

---

## 🧪 Tests
- Tests unitarios en backend  
- Tests de UI en móvil (opcional)  
- Tests de componentes en web  

---

## 🧩 Instalación y ejecución

### 1. Backend
```bash
cd backend
./gradlew bootRun
````

### 2. Web App

```bash
cd web-app
npm install
npm start
```

### 3. Mobile App

Abrir `mobile-app/` en Android Studio y ejecutar.

---

## 👤 Autor

### **Gonzalo Romero Bernal**  
Estudiante de 2º DAM — IES Rafael Alberti

---

## ⭐ Agradecimientos

* OpenAI / bibliotecas usadas
* Frameworks y herramientas que han hecho posible el proyecto

