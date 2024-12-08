// Importaciones
import express from "express";
const router = express.Router();
import mysql from "mysql2";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import path from "path";

import { config } from 'dotenv';
config();

// Configura la aplicación Express
const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(bodyParser.json());

// Configuración de multer para la subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

// Servir archivos estáticos desde la carpeta 'uploads'
app.use('/uploads', express.static('uploads'));

// Conexión a la base de datos MySQL
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_ROOT_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT
});

// Convertir db.query a Promise
const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
};

// Conectar a la base de datos
db.connect(err => {
  if (err) {
    console.error("Error de conexión a MySQL:", err);
    process.exit(1);
  } else {
    console.log("Conectado a la base de datos MySQL");
  }
});

// Configuración de la ruta base de las imágenes
const IMAGE_BASE_URL = process.env.VITE_API_URL || "http://localhost:3000"; 

// Middleware para manejar errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ 
    message: "Error interno del servidor", 
    error: err.message 
  });
});

// Ruta de prueba
app.get("/test", (req, res) => {
  res.json({ message: "Server is running" });
});

// Ruta POST para agregar un nuevo usuario
app.post("/registro", async (req, res) => {
  try {
    const { nombre, email, password, idrol, telefono, fecha_naci } = req.body;
    const sql = "INSERT INTO usuarios (nombre, email, password, idrol, telefono, fecha_naci) VALUES (?, ?, ?, ?, ?, ?)";
    await query(sql, [nombre, email, password, idrol, telefono, fecha_naci]);
    res.status(201).json({ message: "Usuario registrado exitosamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// Ruta de inicio de sesión (Login)
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const sql = "SELECT idusuario, email, idrol, nombre FROM usuarios WHERE email = ? AND password = ?";
    const results = await query(sql, [email, password]);
    
    if (results.length > 0) {
      const { idusuario, idrol, nombre } = results[0];
      res.json({ idusuario, idrol, nombre, message: "Inicio de sesión exitoso" });
    } else {
      res.status(401).json({ message: "Credenciales incorrectas" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// Nueva ruta para obtener todos los usuarios
app.get("/usuarios", (req, res) => {
  const query = "SELECT * FROM usuarios";
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "Error en el servidor" });
    } else {
      res.status(200).json(results);
    }
  });
});

// Nueva ruta para crear un usuario
app.post("/usuarios", (req, res) => {
  const { nombre, email, password, idrol, telefono, fecha_naci } = req.body;
  const query = "INSERT INTO usuarios (nombre, email, password, idrol, telefono, fecha_naci) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(query, [nombre, email, password, idrol, telefono, fecha_naci], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "Error en el servidor al crear usuario" });
    } else {
      res.status(200).json({ message: "Usuario creado exitosamente" });

    }
  });
});

// Nueva ruta para actualizar un usuario
app.put("/usuarios/:id", (req, res) => {
  const { id } = req.params;
  const { nombre, email, password, idrol, telefono, fecha_naci } = req.body;
  const query = "UPDATE usuarios SET nombre = ?, email = ?, password = ?, idrol = ?, telefono = ?, fecha_naci = ? WHERE idusuario = ?";
  db.query(query, [nombre, email, password, idrol, telefono, fecha_naci, id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "Error en el servidor" });
    } else {
      res.status(200).json({ message: "Usuario actualizado exitosamente" });
    }
  });
});

// Nueva ruta para eliminar un usuario
app.delete("/usuarios/:id", (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM usuarios WHERE idusuario = ?";
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "Error en el servidor" });
    } else {
      res.status(200).json({ message: "Usuario eliminado exitosamente" });
    }
  });
});

// Endpoint GET para obtener datos de la base de datos
app.get("/productos", async (req, res) => {
  try {
    const { idcategoria, idoferta } = req.query;
    let sql = "SELECT * FROM productos";
    let values = [];

    if (idcategoria && idoferta) {
      sql += " WHERE idcategoria = ? AND idoferta = ?";
      values = [idcategoria, idoferta];
    } else if (idcategoria) {
      sql += " WHERE idcategoria = ?";

      values = [idcategoria];
    } else if (idoferta) {
      sql += " WHERE idoferta = ?";
      values = [idoferta];
    }

    const results = await query(sql, values);

    // Construir la URL completa de la imagen
    const productosConImagen = results.map(producto => ({
      ...producto,
      imagen: producto.imagen ? `<span class="math-inline">\{IMAGE\_BASE\_URL\}/uploads/</span>{producto.imagen}` : null
    }));

    res.json(productosConImagen);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener productos" });
  }
});

// Ruta para crear un nuevo producto
app.post("/productos", upload.single('imagen'), async (req, res) => {
  const { nombre, descripcion, tamano, precio, idcategoria, idoferta } = req.body;
  const imagen = req.file ? req.file.filename : null;

  if (!nombre || !descripcion || !tamano || !precio || !idcategoria) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }
    
  const query = "INSERT INTO productos (nombre, descripcion, tamano, precio, idcategoria, idoferta, imagen) VALUES (?, ?, ?, ?, ?, ?, ?)";
  const values = [nombre, descripcion, tamano, precio, idcategoria, idoferta, imagen];

  try {

    await new Promise((resolve, reject) => {
      db.query(query, values, (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
    res.status(201).json({ message: "Producto creado exitosamente" });
  } catch (err) {
    console.error("Error ejecutando la consulta:", err);
    res.status(500).json({ error: "Error al crear el producto" });
  }
});

// Ruta PUT para actualizar un Producto
app.put('/productos/:id', upload.single('imagen'), (req, res) => {
  const producto_id = req.params.id;
  const { nombre, descripcion, tamano, precio, idcategoria, idoferta } = req.body;
  const imagen = req.file ? req.file.filename : null;

  let query = 'UPDATE productos SET nombre = ?, descripcion = ?, tamano = ?, precio = ?, idcategoria = ?, idoferta = ?';
  let values = [nombre, descripcion, tamano, precio, idcategoria, idoferta];

  if (imagen) {
    query += ', imagen = ?';
    values.push(imagen);

  }

  query += ' WHERE id_producto = ?';
  values.push(producto_id);

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al actualizar el producto' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json({ message: 'Producto actualizado exitosamente' });
  });
});

// Ruta DELETE para eliminar un producto
app.delete('/productos/:id', (req, res) => {
  const producto_id = req.params.id;
  const query = 'DELETE FROM productos WHERE id_producto = ?';
  const values = [producto_id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al eliminar el producto' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });

      return;
    }

    res.json({ message: 'Producto eliminado exitosamente' });
  });
});

app.get("/productos/:id_producto", (req, res) => {
  const { id_producto } = req.params; // Captura el id del producto de la URL
  const query = "SELECT * FROM productos WHERE id_producto = ?";
  db.query(query, [id_producto], (err, results) => {
    if (err) {
      console.error("Error al obtener el producto:", err);
      return res.status(500).json({ error: "Error al obtener el producto" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(results[0]); // Devuelve solo el primer producto encontrado
  });
});

app.post('/api/resena', (req, res) => {
  const { idusuario, id_producto, calificacion, comentario } = req.body;

  // Validación de datos
  if (!idusuario || !id_producto || !calificacion || !comentario) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  // SQL Query para insertar la reseña
  const query = `
    INSERT INTO resenas (idusuario, id_producto, calificacion, comentario, fecha)
    VALUES (?, ?, ?, ?, NOW())
  `;

  db.query(query, [idusuario, id_producto, calificacion, comentario], (err, result) => {
    if (err) {
      console.error('Error al insertar reseña:', err);  // Verifica el error en el servidor
      return res.status(500).json({ error: 'Error al guardar la reseña' });
    }

    res.status(201).json({ message: 'Reseña creada correctamente' });
  });
});

// Obtener todas las reseñas de un producto, incluyendo el nombre del usuario
app.get('/api/resenas/:id_producto', (req, res) => {
  const { id_producto } = req.params;

  const query = `
    SELECT resenas.id_resena, resenas.calificacion, resenas.comentario, resenas.fecha, usuarios.nombre AS nombre_usuario
    FROM resenas
    JOIN usuarios ON resenas.idusuario = usuarios.idusuario
    WHERE resenas.id_producto = ?
  `;

  db.query(query, [id_producto], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener las reseñas' });
    }
    res.status(200).json(result); // Devuelve las reseñas con el nombre del usuario
  });
});

  // Ruta para obtener todos los roles
app.get('/roles', (req, res) => {
  const query = 'SELECT * FROM rol';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener roles:', err);
      res.status(500).json({ error: 'Error al obtener roles' });
      return;
    }
    res.json(results);
  });
});

//RUTA DE CATEGORIA

// Ruta GET categoria para obtener datos de la base de datos
app.get("/categoria", (req, res) => {
  const query = "SELECT * FROM categoria"; // Cambia "your_table_name" por el nombre de tu tabla

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error ejecutando la consulta:", err);
      res.status(500).json({ error: "Error al obtener los datos" });
      return;
    }
    res.json(results);
  });
});

// Ruta para crear una nueva Categoria
app.post("/categoria", async (req, res) => { //async para permitir el uso de await dentro de esta función, facilitando el manejo de operaciones asincrónicas.
  const { nombre, descripcion, puntos } = req.body;

   // Verificar que todos los campos estén presentes y no sean null o undefined
if (!nombre || !descripcion || puntos === undefined ) {
  return res.status(400).json({ error: "Todos los campos (nombre, descripcion, puntos) son requeridos" });
}
  
  //Define la consulta SQL para insertar un nuevo producto en la base de datos. 
  const query = "INSERT INTO categoria (nombre, descripcion, puntos ) VALUES (?, ?, ?)"; //Usa signos de interrogación ? como marcadores de posición para los valores que serán insertados, lo que ayuda a prevenir inyecciones SQL.
  const values = [nombre, descripcion, puntos ]; // Prepara un array values con los valores a insertar, proporcionando null por defecto para descripcion y tamano si no están definidos.

//Usa un bloque try-catch para manejar la ejecución de la consulta SQL.
try {  //En el try, crea una nueva Promesa que ejecuta la consulta SQL.
  //Si hay un error (err), la promesa se rechaza (reject(err)).
  //Si la consulta es exitosa, la promesa se resuelve con los resultados (resolve(results)).
  await new Promise((resolve, reject) => { //Usa await para esperar la resolución de la Promesa antes de continuar.
      db.query(query, values, (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
    //Si la Promesa se resuelve correctamente, responde con un estado 201 y un mensaje de éxito en formato JSON.
  res.status(201).json({ message: "Categoria creada exitosamente" });
  } catch (err) {
    console.error("Error ejecutando la consulta:", err);
    res.status(500).json({ error: "Error al crear el producto" });
  }
});

// Ruta PUT para actualizar una categoria
app.put('/categoria/:id', (req, res) => {
  const categoria_id = req.params.id;
  const { nombre, descripcion, puntos } = req.body;
  const query = 'UPDATE categoria SET nombre = ?, descripcion = ?, puntos = ? WHERE idcategoria = ?';
  const values = [nombre, descripcion, puntos, categoria_id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al actualizar la categoria' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Categoria no encontrada' });
      return;
    }

    res.json({ message: 'Categoria actualizada exitosamente' });
  });
});


// Ruta DELETE para eliminar una categoria
app.delete('/categoria/:id', (req, res) => {
  const categoria_id = req.params.id;
  const query = 'DELETE FROM categoria WHERE idcategoria = ?';
  const values = [categoria_id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al eliminar la categoria' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Categoria no encontrada' });
      return;
    }

    res.json({ message: 'Categoria eliminada exitosamente' });
  });
});

//RUTA DE NOTIFICACIONES

// Ruta GET notificaciones para obtener datos de la base de datos
app.get("/notificaciones", (req, res) => {
  const query = "SELECT * FROM notificaciones";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error ejecutando la consulta:", err);
      res.status(500).json({ error: "Error al obtener los datos" });
      return;
    }

    // Construir la URL completa de la imagen
    const notificacionesConImagen = results.map(notificacion => ({
      ...notificacion,
      imagen: notificacion.imagen ? `<span class="math-inline">\{IMAGE\_BASE\_URL\}/uploads/</span>{notificacion.imagen}` : null
    }));

    res.json(notificacionesConImagen);
  });
});

// Ruta para crear una nueva notificacion
app.post("/notificaciones", upload.single('imagen'), async (req, res) => {
  const { nombre } = req.body;
  const imagen = req.file ? req.file.filename : null;

  if (!nombre) {
    return res.status(400).json({ error: "El nombre de la notificación es requerido" });
  }

  const query = "INSERT INTO notificaciones (nombre, imagen) VALUES (?, ?)";
  const values = [nombre, imagen];

  try {
    await new Promise((resolve, reject) => {
      db.query(query, values, (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
    res.status(201).json({ message: "Notificación creada exitosamente" });
  } catch (err) {
    console.error("Error ejecutando la consulta:", err);
    res.status(500).json({ error: "Error al crear la notificación" });
  }
});

// Ruta para actualizar una notificación
app.put('/notificaciones/:id', upload.single('imagen'), (req, res) => {
  const idnotificacion = req.params.id;
  const { nombre } = req.body;
  const imagen = req.file ? req.file.filename : null;

  let query = 'UPDATE notificaciones SET nombre = ?';
  let values = [nombre];

  if (imagen) {
    query += ', imagen = ?';
    values.push(imagen);
  }

  query += ' WHERE idnotificacion = ?';
  values.push(idnotificacion);

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al actualizar la notificación' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Notificación no encontrada' });
      return;
    }

    res.json({ message: 'Notificación actualizada exitosamente' });
  });
});

// Ruta para eliminar una notificación
app.delete('/notificaciones/:id', (req, res) => {
  const idnotificacion = req.params.id;

  const query = 'DELETE FROM notificaciones WHERE idnotificacion = ?';
  const values = [idnotificacion];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al eliminar la notificación' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Notificación no encontrada' });
      return;
    }

    res.json({ message: 'Notificación eliminada exitosamente' });
  });
});

//RUTA DE ORDENES

app.get("/ordenes", async (req, res) => {
  try {
    const { idusuario } = req.query;
    let sql = "SELECT * FROM ordenes";
    let values = [];

    if (idusuario) {
      sql += " WHERE idusuario = ?";
      values = [idusuario];
    }

    const results = await query(sql, values);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener ordenes" });
  }
});

// Ruta para crear una nueva orden
app.post("/ordenes", async (req, res) => {
  const { idusuario, fecha_orden, estado, total, tipo_pago, detalle_orden } = req.body;

  try {
    // Iniciar una transacción
    await query("START TRANSACTION");

    // Insertar la orden en la tabla 'ordenes'
    const resultOrden = await query(
      "INSERT INTO ordenes (idusuario, fecha_orden, estado, total, tipo_pago) VALUES (?, ?, ?, ?, ?)",
      [idusuario, fecha_orden, estado, total, tipo_pago]
    );
    const idorden = resultOrden.insertId;

    // Insertar los detalles de la orden en la tabla 'detalle_orden'
    for (const item of detalle_orden) {
      await query(
        "INSERT INTO detalle_orden (idorden, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
        [idorden, item.id_producto, item.cantidad, item.precio_unitario]
      );
    }

    // Confirmar la transacción
    await query("COMMIT");

    res.status(201).json({ message: "Orden creada exitosamente" });
  } catch (error) {
    // Revertir la transacción en caso de error
    await query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Error al crear la orden" });
  }
});

// Ruta PUT para actualizar una orden
app.put('/ordenes/:id', (req, res) => {
  const orden_id = req.params.id;
  const { estado, tipo_pago, total } = req.body;
  const query = 'UPDATE ordenes SET estado = ?, tipo_pago = ?, total = ? WHERE idorden = ?';
  const values = [estado, tipo_pago, total, orden_id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al actualizar la orden' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Orden no encontrada' });
      return;
    }

    res.json({ message: 'Orden actualizada exitosamente' });
  });
});

// Ruta DELETE para eliminar una orden
app.delete('/ordenes/:id', (req, res) => {
  const orden_id = req.params.id;
  const query = 'DELETE FROM ordenes WHERE idorden = ?';
  const values = [orden_id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al eliminar la orden' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Orden no encontrada' });
      return;
    }

    res.json({ message: 'Orden eliminada exitosamente' });
  });
});

//RUTA DE DETALLE DE ORDENES

app.get("/detalle_orden", async (req, res) => {
  try {
    const { idorden } = req.query;
    let sql = "SELECT * FROM detalle_orden";
    let values = [];

    if (idorden) {
      sql += " WHERE idorden = ?";
      values = [idorden];
    }

    const results = await query(sql, values);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener detalle de ordenes" });
  }
});

// Ruta para crear un nuevo detalle de orden
app.post("/detalle_orden", async (req, res) => {
  const { idorden, id_producto, cantidad, precio_unitario } = req.body;

  try {
    const result = await query(
      "INSERT INTO detalle_orden (idorden, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
      [idorden, id_producto, cantidad, precio_unitario]
    );
    res.status(201).json({ message: "Detalle de orden creado exitosamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear el detalle de la orden" });
  }
});

// Ruta PUT para actualizar un detalle de orden
app.put('/detalle_orden/:id', (req, res) => {
  const detalle_orden_id = req.params.id;
  const { idorden, id_producto, cantidad, precio_unitario } = req.body;
  const query = 'UPDATE detalle_orden SET idorden = ?, id_producto = ?, cantidad = ?, precio_unitario = ? WHERE iddetalle_orden = ?';
  const values = [idorden, id_producto, cantidad, precio_unitario, detalle_orden_id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al actualizar el detalle de orden' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Detalle de orden no encontrado' });
      return;
    }

    res.json({ message: 'Detalle de orden actualizado exitosamente' });
  });
});

// Ruta DELETE para eliminar un detalle de orden
app.delete('/detalle_orden/:id', (req, res) => {
  const detalle_orden_id = req.params.id;
  const query = 'DELETE FROM detalle_orden WHERE iddetalle_orden = ?';
  const values = [detalle_orden_id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al eliminar el detalle de orden' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Detalle de orden no encontrado' });
      return;
    }

    res.json({ message: 'Detalle de orden eliminado exitosamente' });
  });
});

//RUTA DE CANJEABLES

app.get("/canjeables", async (req, res) => {
  try {
    const { id_canjeable } = req.query;
    let sql = "SELECT * FROM canjeables";
    let values = [];

    if (id_canjeable) {
      sql += " WHERE id_canjeable = ?";
      values = [id_canjeable];
    }

    const results = await query(sql, values);

    // Construir la URL completa de la imagen
    const canjeablesConImagen = results.map(canjeable => ({
      ...canjeable,
      imagen: canjeable.imagen ? `<span class="math-inline">\{IMAGE\_BASE\_URL\}/uploads/</span>{canjeable.imagen}` : null
    }));

    res.json(canjeablesConImagen);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener canjeables" });
  }
});

// Ruta para crear un nuevo canjeable
app.post("/canjeables", upload.single('imagen'), async (req, res) => {
  const { nombre, descripcion, costo_puntos } = req.body;
  const imagen = req.file ? req.file.filename : null;

  try {
    const result = await query(
      "INSERT INTO canjeables (nombre, descripcion, costo_puntos, imagen) VALUES (?, ?, ?, ?)",
      [nombre, descripcion, costo_puntos, imagen]
    );
    res.status(201).json({ message: "Canjeable creado exitosamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear el canjeable" });
  }
});

// Ruta PUT para actualizar un canjeable
app.put('/canjeables/:id', upload.single('imagen'), (req, res) => {
  const canjeable_id = req.params.id;
  const { nombre, descripcion, costo_puntos } = req.body;
  const imagen = req.file ? req.file.filename : null;

  let query = 'UPDATE canjeables SET nombre = ?, descripcion = ?, costo_puntos = ?';
  let values = [nombre, descripcion, costo_puntos];

  if (imagen) {
    query += ', imagen = ?';
    values.push(imagen);
  }

  query += ' WHERE id_canjeable = ?';
  values.push(canjeable_id);

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al actualizar el canjeable' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Canjeable no encontrado' });
      return;
    }

    res.json({ message: 'Canjeable actualizado exitosamente' });
  });
});

// Ruta DELETE para eliminar un canjeable
app.delete('/canjeables/:id', (req, res) => {
  const canjeable_id = req.params.id;
  const query = 'DELETE FROM canjeables WHERE id_canjeable = ?';
  const values = [canjeable_id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al eliminar el canjeable' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Canjeable no encontrado' });
      return;
    }

    res.json({ message: 'Canjeable eliminado exitosamente' });
  });
});

//RUTA DE CUPONES

app.get("/cupones", async (req, res) => {
  try {
    const { idcupon } = req.query;
    let sql = "SELECT * FROM cupones";
    let values = [];

    if (idcupon) {
      sql += " WHERE idcupon = ?";
      values = [idcupon];
    }

    const results = await query(sql, values);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener cupones" });
  }
});

// Ruta para crear un nuevo cupon
app.post("/cupones", async (req, res) => {
  const { nombre, descripcion, descuento, fecha_inicio, fecha_fin } = req.body;

  try {
    const result = await query(
      "INSERT INTO cupones (nombre, descripcion, descuento, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?, ?)",
      [nombre, descripcion, descuento, fecha_inicio, fecha_fin]
    );
    res.status(201).json({ message: "Cupón creado exitosamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear el cupón" });
  }
});

// Ruta PUT para actualizar un cupon
app.put('/cupones/:id', (req, res) => {
  const cupon_id = req.params.id;
  const { nombre, descripcion, descuento, fecha_inicio, fecha_fin } = req.body;
  const query = 'UPDATE cupones SET nombre = ?, descripcion = ?, descuento = ?, fecha_inicio = ?, fecha_fin = ? WHERE idcupon = ?';
  const values = [nombre, descripcion, descuento, fecha_inicio, fecha_fin, cupon_id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al actualizar el cupon' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Cupón no encontrado' });
      return;
    }

    res.json({ message: 'Cupón actualizado exitosamente' });
  });
});

// Ruta DELETE para eliminar un cupon
app.delete('/cupones/:id', (req, res) => {
  const cupon_id = req.params.id;
  const query = 'DELETE FROM cupones WHERE idcupon = ?';
  const values = [cupon_id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al eliminar el cupon' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Cupón no encontrado' });
      return;
    }

    res.json({ message: 'Cupón eliminado exitosamente' });
  });
});

//RUTA DE OFERTAS

app.get("/ofertas", async (req, res) => {
  try {
    const { idoferta } = req.query;
    let sql = "SELECT * FROM ofertas";
    let values = [];

    if (idoferta) {
      sql += " WHERE idoferta = ?";
      values = [idoferta];
    }

    const results = await query(sql, values);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener ofertas" });
  }
});

// Ruta para crear una nueva oferta
app.post("/ofertas", async (req, res) => {
  const { nombre, descripcion, descuento, fecha_inicio, fecha_fin } = req.body;

  try {
    const result = await query(
      "INSERT INTO ofertas (nombre, descripcion, descuento, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?, ?)",
      [nombre, descripcion, descuento, fecha_inicio, fecha_fin]
    );
    res.status(201).json({ message: "Oferta creada exitosamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear la oferta" });
  }
});

// Ruta PUT para actualizar una oferta
app.put('/ofertas/:id', (req, res) => {
  const oferta_id = req.params.id;
  const { nombre, descripcion, descuento, fecha_inicio, fecha_fin } = req.body;
  const query = 'UPDATE ofertas SET nombre = ?, descripcion = ?, descuento = ?, fecha_inicio = ?, fecha_fin = ? WHERE idoferta = ?';
  const values = [nombre, descripcion, descuento, fecha_inicio, fecha_fin, oferta_id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al actualizar la oferta' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Oferta no encontrada' });
      return;
    }

    res.json({ message: 'Oferta actualizada exitosamente' });
  });
});

// Ruta DELETE para eliminar una oferta
app.delete('/ofertas/:id', (req, res) => {
  const oferta_id = req.params.id;
  const query = 'DELETE FROM ofertas WHERE idoferta = ?';
  const values = [oferta_id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al eliminar la oferta' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Oferta no encontrada' });
      return;
    }

    res.json({ message: 'Oferta eliminada exitosamente' });
  });
});

//RUTA DE PEPPER POINTS

app.get("/pepper_points", async (req, res) => {
  try {
    const { id_pepper } = req.query;
    let sql = "SELECT * FROM pepper_points";
    let values = [];

    if (id_pepper) {
      sql += " WHERE id_pepper = ?";
      values = [id_pepper];
    }

    const results = await query(sql, values);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener pepper points" });
  }
});

// Ruta para crear un nuevo pepper point
app.post("/pepper_points", async (req, res) => {
  const { idusuario, puntos_actuales, puntos_gastados, puntos_totales } = req.body;

  try {
    const result = await query(
      "INSERT INTO pepper_points (idusuario, puntos_actuales, puntos_gastados, puntos_totales) VALUES (?, ?, ?, ?)",
      [idusuario, puntos_actuales, puntos_gastados, puntos_totales]
    );
    res.status(201).json({ message: "Pepper point creado exitosamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear el pepper point" });
  }
});

// Ruta PUT para actualizar un pepper point
app.put('/pepper_points/:id', (req, res) => {
  const pepper_point_id = req.params.id;
  const { idusuario, puntos_actuales, puntos_gastados, puntos_totales } = req.body;
  const query = 'UPDATE pepper_points SET idusuario = ?, puntos_actuales = ?, puntos_gastados = ?, puntos_totales = ? WHERE id_pepper = ?';
  const values = [idusuario, puntos_actuales, puntos_gastados, puntos_totales, pepper_point_id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al actualizar el pepper point' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Pepper point no encontrado' });
      return;
    }

    res.json({ message: 'Pepper point actualizado exitosamente' });
  });
});

// Ruta DELETE para eliminar un pepper point
app.delete('/pepper_points/:id', (req, res) => {
  const pepper_point_id = req.params.id;
  const query = 'DELETE FROM pepper_points WHERE id_pepper = ?';
  const values = [pepper_point_id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al eliminar el pepper point' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Pepper point no encontrado' });
      return;
    }

    res.json({ message: 'Pepper point eliminado exitosamente' });
  });
});

app.listen(3000, () => {
  console.log("Servidor iniciado en el puerto 3000");
});