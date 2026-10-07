// Datos de demostración (valores canónicos del documento de diseño). Se
// generan de forma determinista para que los conteos coincidan siempre:
// 18 materias, 12 docentes, 342 alumnos.

import type {
  AsistenciaDetalle,
  Facultad,
  MateriaDetalle,
  PracticaDetalle,
  TemaPractica,
  UsuarioDetalle,
} from "@/types/portal";
import type { PracticeInDB } from "@/types";

export interface DbUsuario extends UsuarioDetalle {
  password: string;
}

export interface MockDb {
  usuarios: DbUsuario[];
  materias: MateriaDetalle[];
  practicas: PracticaDetalle[];
  asistencias: AsistenciaDetalle[];
}

export const PASSWORD_DEMO = "UNIVO*2026";

const SALUD = "Facultad de Ciencias de la Salud";
const INGENIERIA = "Facultad de Ingeniería y Arquitectura";
const AGRONOMIA = "Facultad de Ciencias Agronómicas";

export const FACULTADES: Facultad[] = [
  { nombre: SALUD, carreras: ["Lic. en Química y Farmacia", "Doctorado en Medicina", "Lic. en Enfermería"] },
  { nombre: INGENIERIA, carreras: ["Ingeniería Civil", "Ingeniería Industrial", "Arquitectura"] },
  { nombre: AGRONOMIA, carreras: ["Ingeniería Agronómica"] },
];

const BL = "Bata de Lab";
const GF = "Gafas Prot.";
const BT = "Botas Seg.";
const CA = "Casco";
const CH = "Chaleco";
const BC = "Bata de Clínica";

// Mismo contrato que GET /practices: EPP por área cuando la materia no define el suyo.
export const CATALOGO_EPP: PracticeInDB[] = [
  { _id: "cat-civil", area: "civil", nombre: "Ingeniería Civil", ppe_requerido: [CA, CH, BT] },
  { _id: "cat-medicina", area: "medicina", nombre: "Medicina", ppe_requerido: [BL, GF] },
];

export const PERMISOS_COORDINADOR = ["Crear Materias", "Modificar EPP Obligatorio", "Enrolar Alumnos"];

const TEMAS_QO101 = [
  "Normas de Bioseguridad y Material de Vidrio",
  "Recristalización y Punto de Fusión",
  "Destilación de Compuestos Orgánicos",
  "Extracción Líquido-Líquido",
  "Cromatografía en Capa Fina",
];
const TEMAS_MEDICINA = [
  "Normas de Bioseguridad y Manejo de Material",
  "Preparación de Soluciones y Reactivos",
  "Técnicas de Asepsia y Antisepsia",
  "Evaluación Práctica de Procedimientos",
  "Análisis de Muestras y Reporte",
];
const TEMAS_CIVIL = [
  "Inducción de Seguridad y Uso de Equipo",
  "Mediciones y Calibración de Instrumentos",
  "Ensayo Práctico de Materiales",
  "Operación Supervisada de Maquinaria",
  "Evaluación de Campo y Reporte Técnico",
];

export function temasDeMateria(materia: MateriaDetalle): TemaPractica[] {
  const temas =
    materia.codigo === "QO101" ? TEMAS_QO101 : materia.area === "medicina" ? TEMAS_MEDICINA : TEMAS_CIVIL;
  return temas.map((tema, i) => ({ numero: i + 1, tema }));
}

const correo = (nombre: string, dominio = "univo.edu.sv") =>
  `${nombre
    .replace(/^(Dra?|Ing|Licda?|Arq)\.\s+/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .slice(0, 2)
    .join(".")}@${dominio}`;

function crearUsuarios(): DbUsuario[] {
  const admin: DbUsuario = {
    _id: "adm-001",
    codigo: "EMP-00001",
    nombre: "Dr. Alejandro Gómez",
    rol: "admin",
    correo: "alejandro.gomez@univo.edu.sv",
    activo: true,
    password: PASSWORD_DEMO,
  };

  const coordinadores: DbUsuario[] = (
    [
      ["EMP-09214", "Lic. Carlos Castillo", SALUD],
      ["EMP-08127", "Ing. Patricia Navarrete", INGENIERIA],
      ["EMP-07563", "Ing. Óscar Benítez", AGRONOMIA],
    ] as const
  ).map(([codigo, nombre, facultad], i) => ({
    _id: `coo-00${i + 1}`,
    codigo,
    nombre,
    rol: "coordinador",
    facultad,
    correo: correo(nombre),
    activo: true,
    permisos: i === 2 ? PERMISOS_COORDINADOR.slice(0, 2) : PERMISOS_COORDINADOR,
    password: PASSWORD_DEMO,
  }));

  const docentes: DbUsuario[] = (
    [
      ["DOC-202101", "Dra. María Elena Ramos", "Química y Farmacia", SALUD],
      ["DOC-201904", "Ing. Roberto Solórzano", "Ingeniería Civil", INGENIERIA],
      ["DOC-201811", "Dr. José Antonio Villalta", "Medicina", SALUD],
      ["DOC-202003", "Licda. Ana Lucía Portillo", "Enfermería", SALUD],
      ["DOC-201707", "Ing. Marvin Ernesto Guevara", "Ingeniería Industrial", INGENIERIA],
      ["DOC-202205", "Arq. Gabriela Sorto", "Arquitectura", INGENIERIA],
      ["DOC-201609", "Ing. Héctor Amaya", "Agronomía", AGRONOMIA],
      ["DOC-202108", "Dra. Karla Beatriz Zelaya", "Medicina", SALUD],
      ["DOC-201912", "Ing. Luis Fernando Cruz", "Ingeniería Civil", INGENIERIA],
      ["DOC-202302", "Lic. Mario René Quintanilla", "Química y Farmacia", SALUD],
      ["DOC-201505", "Ing. Sandra Yamileth Rivera", "Agronomía", AGRONOMIA],
      ["DOC-201410", "Dr. Ricardo Alfonso Meléndez", "Medicina", SALUD],
    ] as const
  ).map(([codigo, nombre, departamento, facultad], i) => ({
    _id: `doc-${String(i + 1).padStart(3, "0")}`,
    codigo,
    nombre,
    rol: "docente",
    facultad,
    departamento,
    coordinador_id: coordinadores.find((c) => c.facultad === facultad)!._id,
    correo: correo(nombre),
    activo: i !== 11,
    password: PASSWORD_DEMO,
  }));

  const QF = "Lic. en Química y Farmacia";
  const nombrados: [string, string, string, string][] = [
    ["U20210452", "Gerardo Alberto Argueta Mendoza", QF, SALUD],
    ["U20220912", "Camila Belén Fuentes", QF, SALUD],
    ["U20210834", "Roberto Carlos Palacios", QF, SALUD],
    ["U20230231", "Daniela Sofía Menjívar", QF, SALUD],
    ["U20221042", "Kevin Alexander Rivas Mejía", "Ingeniería Industrial", INGENIERIA],
  ];

  const N1 = ["María", "José", "Ana", "Carlos", "Sofía", "Luis", "Andrea", "Diego", "Valeria", "Fernando", "Gabriela", "Óscar", "Paola", "Ricardo", "Karla", "Josué", "Alejandra", "Marvin", "Rebeca"];
  const N2 = ["Elena", "Antonio", "Beatriz", "Ernesto", "Guadalupe", "Enrique", "Isabel", "Alberto", "Michelle", "David", "Nohemy", "Armando", "Lissette"];
  const A1 = ["Hernández", "Martínez", "Flores", "Portillo", "Romero", "Chávez", "Amaya", "Benítez", "Cruz", "Guevara", "Zelaya", "Quintanilla", "Sorto", "Villalta", "Campos", "Reyes", "Turcios"];
  const A2 = ["López", "García", "Rodríguez", "Ramírez", "Vásquez", "Mejía", "Argueta", "Bonilla", "Díaz", "Escobar", "Granados"];
  const carreras = FACULTADES.flatMap((f) => f.carreras.map((c) => [c, f.nombre] as const));

  const alumnos: DbUsuario[] = [];
  for (let i = 0; i < 342; i++) {
    const [codigo, nombre, carrera, facultad] =
      nombrados[i] ??
      ([
        `U20${22 + (i % 3)}${String(3000 + i * 7).padStart(4, "0")}`,
        // N1 y N2 alternan femenino/masculino: el segundo nombre toma la misma paridad que el primero.
        `${N1[i % N1.length]} ${N2[2 * ((i * 5) % 6) + ((i % N1.length) % 2)]} ${A1[(i * 3) % A1.length]} ${A2[(i * 7) % A2.length]}`,
        ...carreras[i < 60 ? 0 : i % carreras.length],
      ] as [string, string, string, string]);
    alumnos.push({
      _id: `alu-${String(i + 1).padStart(3, "0")}`,
      codigo,
      nombre,
      rol: "alumno",
      carrera,
      facultad,
      correo: `${codigo.toLowerCase()}@alumnos.univo.edu.sv`,
      activo: true,
      estatus: "Estudiante Activo Ciclo II-2026",
      rostro_registrado: i < 5 || i % 23 !== 0,
      password: PASSWORD_DEMO,
    });
  }

  return [admin, ...coordinadores, ...docentes, ...alumnos];
}

// [código, sección, nombre, índice de docente, lugar, EPP, facultad, carrera, inscritos]
const MATERIAS: [string, string, string, number, string, string[], string, string, number][] = [
  ["QO101", "A", "Química Orgánica I", 0, "Laboratorio B-2", [BL, GF], SALUD, "Lic. en Química y Farmacia", 28],
  ["BQ202", "A", "Bioquímica General", 0, "Laboratorio B-4", [BL, GF], SALUD, "Lic. en Química y Farmacia", 24],
  ["AQ305", "B", "Análisis Químico Instrumental", 0, "Laboratorio C-1", [BL, GF, BT], SALUD, "Lic. en Química y Farmacia", 22],
  ["MC204", "B", "Mecánica de Sólidos", 1, "Taller de Estructuras T-1", [CA, CH, BT], INGENIERIA, "Ingeniería Civil", 30],
  ["AN110", "A", "Anatomía Humana I", 2, "Clínica de Simulación C-3", [BC], SALUD, "Doctorado en Medicina", 26],
  ["FS210", "A", "Fisiología Médica", 7, "Laboratorio de Fisiología C-5", [BC, GF], SALUD, "Doctorado en Medicina", 25],
  ["EF120", "B", "Fundamentos de Enfermería", 3, "Clínica de Enfermería E-1", [BC], SALUD, "Lic. en Enfermería", 30],
  ["MB230", "A", "Microbiología General", 9, "Laboratorio B-6", [BL, GF], SALUD, "Lic. en Química y Farmacia", 20],
  ["FT340", "A", "Farmacotecnia I", 9, "Laboratorio B-3", [BL, GF], SALUD, "Lic. en Química y Farmacia", 18],
  ["RM310", "A", "Resistencia de Materiales", 1, "Laboratorio de Materiales T-2", [CA, CH, BT], INGENIERIA, "Ingeniería Civil", 27],
  ["TC220", "A", "Tecnología del Concreto", 8, "Laboratorio de Suelos y Concreto T-4", [CA, CH, BT, GF], INGENIERIA, "Ingeniería Civil", 24],
  ["TP115", "B", "Topografía I", 8, "Campo de Prácticas Norte", [CA, CH], INGENIERIA, "Ingeniería Civil", 26],
  ["PM250", "A", "Procesos de Manufactura", 4, "Taller Industrial I-1", [CA, GF, BT], INGENIERIA, "Ingeniería Industrial", 23],
  ["SH330", "A", "Seguridad e Higiene Industrial", 4, "Taller Industrial I-2", [CA, CH, BT], INGENIERIA, "Ingeniería Industrial", 21],
  ["CN140", "A", "Construcción I", 5, "Taller de Maquetas A-2", [CA, CH], INGENIERIA, "Arquitectura", 19],
  ["SU210", "A", "Edafología", 6, "Laboratorio de Suelos G-1", [BL, BT], AGRONOMIA, "Ingeniería Agronómica", 22],
  ["FP125", "A", "Fitopatología", 10, "Laboratorio de Sanidad Vegetal G-2", [BL, GF], AGRONOMIA, "Ingeniería Agronómica", 20],
  ["MA310", "B", "Maquinaria Agrícola", 6, "Taller Agrícola G-4", [CA, BT, CH], AGRONOMIA, "Ingeniería Agronómica", 18],
];

// Materias (además de QO101) donde está inscrito el estudiante de prueba.
const MATERIAS_DE_GERARDO = ["MC204", "AN110"];

function crearMaterias(usuarios: DbUsuario[]): MateriaDetalle[] {
  const docentes = usuarios.filter((u) => u.rol === "docente");
  const alumnos = usuarios.filter((u) => u.rol === "alumno");

  return MATERIAS.map(([codigo, seccion, nombre, d, aula, epp, facultad, carrera, n], k) => {
    let inscritos: DbUsuario[];
    if (k === 0) {
      // QO101: los cuatro alumnos de ejemplo + 24 más (Kevin queda fuera, para la búsqueda en padrón).
      inscritos = [...alumnos.slice(0, 4), ...alumnos.slice(5, 29)];
    } else {
      const inicio = 5 + ((k * 19) % 300);
      const conGerardo = MATERIAS_DE_GERARDO.includes(codigo);
      inscritos = [
        ...(conGerardo ? [alumnos[0]] : []),
        ...alumnos.slice(inicio, inicio + n - (conGerardo ? 1 : 0)),
      ];
    }
    return {
      _id: `mat-${String(k + 1).padStart(3, "0")}`,
      codigo,
      seccion,
      nombre,
      area: facultad === SALUD ? "medicina" : "civil",
      carrera,
      facultad,
      aula,
      epp,
      docente_id: docentes[d]._id,
      coordinador_id: docentes[d].coordinador_id!,
      alumnos_ids: inscritos.map((a) => a._id),
    };
  });
}

const FECHAS = ["2026-10-28", "2026-11-04", "2026-11-11", "2026-11-18"];
const HORAS = ["10:00", "13:00", "15:00"];
const pad = (n: number) => String(n).padStart(2, "0");

/** Hora local -> formato del backend: ISO en UTC y sin zona horaria. */
export const fechaApi = (fecha: Date | string = new Date()) => new Date(fecha).toISOString().slice(0, -1);

function crearPracticasYAsistencias(materias: MateriaDetalle[]) {
  const practicas: PracticaDetalle[] = [];
  const asistencias: AsistenciaDetalle[] = [];

  materias.forEach((materia, k) => {
    const total = k === 0 ? 4 : 2 + (k % 3);
    const horaBase = k === 0 ? "08:00" : HORAS[k % 3];
    const temas = temasDeMateria(materia);
    const epp = materia.epp ?? [];

    for (let j = 0; j < total; j++) {
      const inicio = fechaApi(`${FECHAS[j]}T${horaBase}:00`);
      const practica: PracticaDetalle = {
        _id: `pra-${pad(k + 1)}-${j + 1}`,
        materia_id: materia._id,
        docente_id: materia.docente_id,
        fecha: inicio,
        hora_inicio: inicio,
        hora_fin: fechaApi(`${FECHAS[j]}T${pad(Number(horaBase.slice(0, 2)) + 2)}:00:00`),
        estado: "finalizada",
        numero: j + 1,
        tema: temas[j].tema,
      };
      practicas.push(practica);

      materia.alumnos_ids.forEach((alumnoId, i) => {
        const h = (i * 31 + j * 17 + k * 7) % 29;
        let ausente = h === 0 || h === 13;
        let faltantes = h === 5 ? [epp[(i + j) % epp.length]] : [];
        if (k === 0 && j === 3) {
          // 18 Nov: 26 de 28 presentes, todos con EPP completo.
          ausente = i >= 26;
          faltantes = [];
        }
        if (k === 0 && j === 1 && i === 2) {
          // 04 Nov: Roberto Carlos Palacios no portaba gafas.
          ausente = false;
          faltantes = [GF];
        }
        if (ausente) return;

        const segundos = 90 + i * 51;
        const hh = pad(Number(horaBase.slice(0, 2)));
        asistencias.push({
          _id: `asi-${practica._id}-${alumnoId}`,
          practica_id: practica._id,
          materia_id: materia._id,
          alumno_id: alumnoId,
          hora_identificacion: fechaApi(`${FECHAS[j]}T${hh}:${pad(Math.floor(segundos / 60))}:${pad(segundos % 60)}`),
          cumplio_indumentaria: faltantes.length === 0,
          faltantes,
        });
      });
    }
  });

  return { practicas, asistencias };
}

export function crearDb(): MockDb {
  const usuarios = crearUsuarios();
  const materias = crearMaterias(usuarios);
  return { usuarios, materias, ...crearPracticasYAsistencias(materias) };
}
