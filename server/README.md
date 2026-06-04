# Pasapalabra Backend 🖥️

Este directorio contiene el código del servidor backend de Pasapalabra, encargado de administrar la persistencia de las ruletas, validar las contraseñas para los presentadores (Hosts), almacenar los rankings y habilitar la comunicación multijugador en tiempo real.

---

## 🚀 Cómo Levantar el Servidor

Sigue estos pasos para arrancar el servidor backend localmente:

### 1. Navegar al directorio del servidor
Si estás en la raíz del proyecto:
```bash
cd server
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Iniciar el servidor
```bash
npm run dev
```
*Por defecto, el servidor levantará en `http://localhost:3001`.*

---

## ⚙️ Funcionamiento y Estructura del Servidor

El servidor está construido con **Express** para el manejo de rutas HTTP convencionales y **Socket.IO** montado sobre un servidor HTTP nativo de Node.js para gestionar flujos bidireccionales en tiempo real.

### 💾 Persistencia de Datos (Base de Datos Local JSON)
No requiere de un motor de bases de datos externo (como PostgreSQL o MongoDB). En su lugar, utiliza el sistema de archivos de Node (`fs`) para guardar y recuperar la información mediante archivos `.json` estructurados en la raíz del directorio `server/`:

*   **`ruletasData.json`**: Guarda la colección de ruletas creadas por los usuarios en la aplicación (títulos, descripciones, preguntas, respuestas correctas e historiales de rankings).
*   **`ruletasPasswords.json`**: Almacena las contraseñas encriptadas o en texto plano asociadas a cada ID de ruleta para el control de acceso del Host (ej: `{"default-1": "1234"}`).
*   **`defaultRanking.json`**: Guarda un diccionario con los rankings de las ruletas estáticas o por defecto (`default-1`, `ruleta-1780551059362`), separándolos de la base de datos de ruletas personalizadas.

---

## 📡 Endpoints del API REST

El servidor expone los siguientes endpoints HTTP en el puerto `3001`:

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| **GET** | `/api/ruletas` | Obtiene la lista de todas las ruletas personalizadas guardadas. |
| **GET** | `/api/ruletas/default-ranking` | Obtiene el mapa de rankings de todas las ruletas por defecto. |
| **POST** | `/api/ruletas/new` | Crea una nueva ruleta personalizada y registra su contraseña. |
| **DELETE**| `/api/ruletas/:id` | Elimina una ruleta personalizada y su contraseña mediante su ID. |
| **POST** | `/api/ruletas/:id/ranking` | Añade y ordena una nueva marca de puntaje (ranking) a una ruleta (personalizada o por defecto). |
| **POST** | `/api/verify-host` | Valida si la contraseña enviada coincide con la contraseña registrada para la ruleta. |

---

## 🔌 Eventos de Socket.IO (Tiempo Real)

El servidor organiza a los clientes conectados en "salas" basadas en el ID de la ruleta actual, permitiendo la interacción en vivo entre los Jugadores y el Host:

### Eventos del Jugador al Servidor (Escuchados en el Backend)
*   **`player:join`**: Registra al jugador en el sistema de la ruleta asignada, verifica que su nombre de usuario no esté repetido en la sala, lo une a la sala de Socket correspondientes y notifica al presentador.
*   **`player:status`**: Envía actualizaciones sobre el estado del jugador (`playing`, `paused`, `abandoned`).
*   **`player:update`**: Notifica en vivo las estadísticas del jugador al Host (aciertos, errores, letra actual y tiempo restante).
*   **`player:finished`**: Notifica cuando el jugador ha finalizado de responder el Rosco completo.

### Eventos del Host al Servidor (Escuchados en el Backend)
*   **`host:join`**: Registra la sesión del presentador uniéndolo a una sala exclusiva de administración (`host-ruletaId`).
*   **`host:kick_player`**: Permite al Host expulsar a un jugador específico de la sala de juego.

---

## 📁 Estructura del Servidor

```text
server/
├── index.js                # Lógica principal del servidor, configuración de Sockets y rutas Express
├── defaultRanking.json     # Historial persistente de rankings de ruletas por defecto
├── ruletasData.json        # Base de datos persistente de ruletas de usuarios
├── ruletasPasswords.json   # Base de datos persistente de contraseñas de ruletas
├── package.json            # Script de ejecución ('npm run dev') y dependencias
└── README.md               # Esta documentación
```
