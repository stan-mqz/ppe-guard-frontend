# Tarea (backend): vista previa de la cámara del servidor para el enrolamiento

## Contexto

Trabajas solo en `PPE_Guard/` (FastAPI + OpenCV). No toques el frontend
(`ppe-guard-frontend/`); otra persona lo adaptará después a partir de lo que
dejes documentado.

Al dar de alta un alumno, el rostro lo captura el servidor, no el navegador:
`POST /api/v1/usuarios/alumnos` (`app/api/v1/endpoints/usuarios.py`) llama a
`capture_single_frame()` de `app/sue abre la cámara
con OpenCV, toma un frame y la libera. Hoy el coordinador captura a ciegas,
porque no hay forma de ver esa cámara fuera de una práctica activa: no sabe si
el alumno está encuadrado ni si haa que llega el
error 422.

## Objetivo

Que el backend permita encender y  cámara del
servidor mientras el coordinador está en la pantalla de enrolamiento, de modo
que el stream existente entregue imagen en ese momento y el frame que se guarda
al crear el alumno sea el mismo qu

## Lo que ya existe y debes reutilizar

- `GET /api/v1/stream` (`app/api/v1/endpoints/stream.py`): MJPEG con el último
  frame de `camera_service`. Recib
  (`get_current_user_media` en `app/api/v1/dependencies.py`), porque un `<img>`
  no puede mandar el header Author docente y
  coordinador. El frontend usará este mismo endpoint para la vista previa.
- `capture_single_frame()` ya devuelve el último frame de `camera_service` si
  este está corriendo, en vez de ada vez. Por eso,
  con la vista previa encendida, la captura del alta sale del mismo flujo que se
  ve en pantalla sin tocar ese end

## El problema central: la cámara es un recurso compartido

`camera_service` es un singleton y hoy tiene un único dueño:
`PracticaOrchestrator` (`app/services/practica_orchestrator.py`) lo enciende en
`start()` y lo apaga en `stop()`. i la cámara está
apagada, `_generate_mjpeg` se queda en el bucle esperando indefinidamente sin
enviar imagen.

Con la vista previa habrá dos consumidores, y ninguno debe apagarle la cámara al
otro:

- Si hay una práctica activa y se apaga la vista previa, la cámara tiene que
  seguir encendida para la práctic
- Si la vista previa está encendida y una práctica termina, la vista previa no
  debe quedarse sin imagen.

Resuélvelo dentro de `CameraService`, con un registro de quién la está usando
(por ejemplo, adquirir y liberar por nombre de consumidor), de forma que el
dispositivo se abra con el primero y se libere solo cuando no quede ninguno.
Requisitos:

- Seguro entre hilos: el orquestadlos endpoints en
  el event loop.
- Idempotente: adquirir dos veces r sin haber
  adquirido, no debe romper el conteo ni lanzar errores.
- Adapta `PracticaOrchestrator` a ese mecanismo sin cambiar su comportamiento.
- `capture_single_frame()` consultg`; si cambias
  cómo se representa ese estado, mantenla coherente.
- `lifespan` en `app/main.py` llama a `practica_registry.detener_todos()` al
  apagar el servidor: al cerrar, l aunque haya
  quedado una vista previa abierta.

## Qué construir

1. Una forma de encender y apagar a los mismos
   roles que pueden enrolar (coordinador y docente, como en
   `POST /usuarios/alumnos`). Sigue las convenciones de los endpoints existentes:
   `require_role`, router registra esquemas de
   respuesta como en el resto del proyecto. Estas llamadas se hacen con `fetch`,
   así que usan la autenticación normal por header, no la de `?token=`.
2. `CameraService.start()` abre elames de
   calentamiento, lo cual bloquea: llámalo con `asyncio.to_thread`, como ya se
   hace con `capture_single_frame`.
3. Si la cámara no se puede abrir,`detail` claros
   que el frontend pueda mostrar. Hoy `start()` lanza `RuntimeError`; no dejes
   que eso salga como un 500 genérico ni que el consumidor quede registrado
   aunque el dispositivo no se hay
4. La vista previa no debe quedar encendida para siempre si el navegador se
   cierra sin avisar (pestaña cerrada, corte de red). Agrega una salvaguarda en
   el servidor; por ejemplo, liberar la vista previa cuando no haya clientes
   leyendo el stream durante unos segundos, o un tiempo máximo de vida que el
   cliente renueva. Elige la que explica cuál
   elegiste. La salvaguarda solo debe liberar la vista previa, nunca la cámara
   de una práctica activa.
5. Revisa `_generate_mjpeg`: con la cámara apagada hoy gira para siempre. Decide
   si debe cortar la respuesta cua para que el
   `<img>` del navegador reciba un error en vez de quedarse cargando.

## Restricciones

- No cambies el contrato de `POST ni la
  autenticación de `GET /stream`.
- No rompas la práctica en vivo: el orquestador, las detecciones y el WebSocket
  deben funcionar igual que antes.
- Respeta el estilo del código: nombres y comentarios en español y la misma
  densidad de comentarios que los archivos que tocas.
- Documenta los endpoints nuevos (ruta, método, roles, respuestas y errores) en
  `FRONTEND.md` y `DOCUMENTACION_Tficiente para que
  alguien pueda integrar el frontend sin leer el código.

## Cómo verificar

Prueba estos casos con el servidor levantado, usando `curl` o un cliente HTTP, y
reporta el resultado de cada uno. Si alguno no pudiste probarlo (por ejemplo,
por no tener cámara física), dilo rlo por bueno.

1. Sin práctica activa: encender la vista previa hace que `GET /stream` entregue
   frames; apagarla libera el dispositivo (otro proceso puede abrir la cámara).
2. Con la vista previa encendida,  el alumno sin
   conflicto de acceso al dispositivo.
3. Con la vista previa encendida y2 y la vista
   previa sigue entregando frames.
4. Con una práctica activa: encendo interrumpe la
   práctica ni sus detecciones.
5. Con la vista previa encendida: finalizar una práctica no corta el stream.
6. Encender la vista previa y no a termina
   liberando la cámara.
7. Sin cámara conectada: encender la vista previa devuelve el error definido y
   no deja ningún consumidor regis
8. Encender dos veces seguidas y apagar una: el comportamiento es el que
   documentaste.
9. Apagar el servidor con la vistativo queda libre.
10. Si el proyecto tiene pruebas, pásalas; si agregas lógica de conteo de
    consumidores, cúbrela con pruebas que no dependan de una cámara real.

Al terminar, resume qué archivos tocaste, cómo resolviste el uso compartido de
la cámara, qué salvaguarda elegiste para la vista previa huérfana y el contrato
exacto de los endpoints nuevos.