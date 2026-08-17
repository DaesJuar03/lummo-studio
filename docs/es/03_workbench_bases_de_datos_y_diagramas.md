# Workbench de Bases de Datos y Diagramas Entidad-Relación

<p align="center">
  <strong>Lummo Studio v2.1.0 — Módulo Técnico 03 (Español)</strong>
</p>

<p align="center">
  <a href="../INDEX_ES.md">← Volver al Índice General</a> | 
  <a href="../en/03_database_workbench_and_diagrams.md">English Version</a>
</p>

---

## 1. Soporte Multi-Motor SQL

Lummo Studio actúa como un cliente unificado de administración de bases de datos relacionales, soportando conectores nativos en Node.js:

| Motor SQL | Driver / Biblioteca Utilizada | Modo de Conexión |
| :--- | :--- | :--- |
| **SQLite 3** | `sql.js` / Persistencia física en Node.js | Archivo local `.db`, `.sqlite`, `.sqlite3` |
| **MySQL / MariaDB** | `mysql2/promise` | Conexión TCP/IP (Host, Puerto, Usuario, Password) |
| **PostgreSQL** | `pg` (node-postgres) | Conexión TCP/IP / Connection String / SSL |

---

## 2. Generador de Diagramas Entidad-Relación (ER)

El componente `ErDiagramModal.jsx` proporciona una representación gráfica de las tablas y sus relaciones de clave foránea.

### Características del Diagrama ER:
- **Auto-Layout e Inspección de Esquema**: Lee las claves primarias (`PK`) y claves foráneas (`FK`) de la base de datos conectada y posiciona automáticamente los nodos de las tablas.
- **Lienzo Interactivo (HTML5 Canvas)**: Soporta arrastrar tablas (drag & drop), aplicar zoom con la rueda del ratón y ajustar conectores con curvas Bezier.
- **Exportación Visual**: Permite guardar el mapa completo del esquema en formato de imagen PNG o SVG de alta resolución para documentación de proyectos.

```text
[Tabla: users]               [Tabla: orders]
+------------------+         +------------------+
| id (PK)          |------<  | id (PK)          |
| name             |         | user_id (FK)     |
| email            |         | total_amount     |
+------------------+         +------------------+
```

---

## 3. Diseñador de Esquemas Visual y SQL Runner

### 3.1 Diseñador Visual de Tablas (`SchemaDesignerModal.jsx`)
Permite modificar o crear nuevas estructuras de datos sin escribir sentencias DDL complejas:
- Añadir/eliminar columnas.
- Asignación de tipos de datos (`VARCHAR`, `INT`, `BIGINT`, `TIMESTAMP`, `BOOLEAN`, `TEXT`, `BLOB`).
- Configuración de modificadores: `NOT NULL`, `AUTO_INCREMENT`, `UNIQUE`, `DEFAULT`.
- Creación de claves primarias e índices secundarios.

### 3.2 SQL Query Runner y Grid Virtualizado
Ubicado en `DatabaseDetailPage.jsx` y `SQLiteWorkbench.jsx`:
- **Consola de Consultas SQL**: Editor de texto con resaltado de sintaxis SQL e historial de ejecuciones.
- **Grid Virtualizado**: Para prevenir congelamientos de memoria al consultar tablas con miles de registros, la interfaz utiliza renderizado virtualizado de filas, cargando únicamente las filas visibles en pantalla.

---

## 4. Generación de Mock Data e Importación/Exportación

### 4.1 Generador de Datos Sintéticos (`MockDataGeneratorModal.jsx`)
Permite poblar tablas de prueba con datos ficticios pero estructurados (nombres, correos electrónicos, fechas, números de teléfono, direcciones IP, UUIDs) especificando el número de registros deseado (ej. 100, 1,000 o 10,000 filas).

### 4.2 Importación y Exportación SQL (`ImportExportSqlModal.jsx` y `DataExportModal.jsx`)
- **Exportación**:
  - Volcados completos de base de datos (`.sql` DDL + DML).
  - Exportación de resultados de consultas en formatos **CSV** y **JSON**.
- **Importación**:
  - Ejecución de scripts de restauración SQL desde archivos externos `.sql`.
