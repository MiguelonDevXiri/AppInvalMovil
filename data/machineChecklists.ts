// Definir interfaces para los tipos
export interface ChecklistItem {
  id: string;
  text: string;
}

export interface ChecklistCategory {
  category: string;
  items: ChecklistItem[];
}

// Lista de categorías e ítems para los checklists de diferentes tipos de máquinas

// 1. Checklist para Autocompactadores
export const autocompactadorChecklist: ChecklistCategory[] = [
  {
    category: 'General',
    items: [
      { id: 'auto_gen1', text: 'Estado gancho delantero' },
      { id: 'auto_gen2', text: 'Estado gancho trasero' },
      { id: 'auto_gen3', text: 'Estado suelo' },
      { id: 'auto_gen4', text: 'Estado vigas' },
      { id: 'auto_gen5', text: 'Estado rodillos traseros' },
      { id: 'auto_gen6', text: 'Estado rodillos delanteros' },
      { id: 'auto_gen7', text: 'Estado carraca cierre puerta descarga' },
      { id: 'auto_gen8', text: 'Estado uñas cierre puerta descarga' },
      { id: 'auto_gen9', text: 'Estado cadenas/sujeción puerta descarga abierta' },
      { id: 'auto_gen10', text: 'Estado chapa y pintura (agujeros en chapa)' },
      { id: 'auto_gen11', text: 'Estado toldo/tapa tolva' },
      { id: 'auto_gen12', text: '¿Tiene cuerda para cerrar tapa tolva?' },
      { id: 'auto_gen13', text: 'Estado cierre tapa tolva' },
      { id: 'auto_gen14', text: 'Pegatinas riesgo eléctrico' },
      { id: 'auto_gen15', text: 'Pegatina inval' },
      { id: 'auto_gen16', text: 'Pegatina atrapamiento tolva' },
      { id: 'auto_gen17', text: 'Pegatinas seguridad' },
      { id: 'auto_gen18', text: 'Estado plato prensor' },
      { id: 'auto_gen19', text: 'Estado puertas/tapas alojamiento cilindros' },
      { id: 'auto_gen20', text: 'Estado protecciones botoneras' },
      { id: 'auto_gen21', text: '¿Los teflones están correctamente ajustados?' },
      { id: 'auto_gen22', text: 'Estado goma estanca' },
      { id: 'auto_gen23', text: 'Estado llave vierte líquidos' },
      { id: 'auto_gen24', text: 'Estado pernos, puerta de descarga' },
    ]
  },
  {
    category: 'Electricidad',
    items: [
      { id: 'auto_elec1', text: 'Estado botoneras (setas, pulsadores, etc)' },
      { id: 'auto_elec2', text: '¿Funciona correctamente los paros de emergencia?' },
      { id: 'auto_elec3', text: 'Estado conexión mando muelle' },
      { id: 'auto_elec4', text: 'Estado clavija inversora' },
      { id: 'auto_elec5', text: 'Estado seccionador candable' },
      { id: 'auto_elec6', text: 'Estado caja cuadro eléctrico' },
      { id: 'auto_elec7', text: 'Funcionamiento correcto de la maquina' },
      { id: 'auto_elec8', text: '¿la máquina para sola?' },
      { id: 'auto_elec9', text: 'Estado fotocélulas' },
      { id: 'auto_elec10', text: 'Funciona la luz de lleno' },
    ]
  },
  {
    category: 'Hidráulica',
    items: [
      { id: 'auto_hidr1', text: '¿hay fugas de aceite?' },
      { id: 'auto_hidr2', text: 'Estado cilindros' },
      { id: 'auto_hidr3', text: 'Estado válvula inversora' },
      { id: 'auto_hidr4', text: '¿hace el cambio bien? (en caso de no hacer el cambio, problema inversora o cilindro, foto del causante)' },
      { id: 'auto_hidr5', text: '¿las presiones son correctas?' },
      { id: 'auto_hidr6', text: 'Estado aceite hidráulico' },
      { id: 'auto_hidr7', text: 'Estado filtro hidráulico' },
    ]
  }
];

// 2. Checklist para Compactador Estático
export const compactadorEstaticoChecklist: ChecklistCategory[] = [
  {
    category: 'General',
    items: [
      { id: 'comp_gen1', text: 'Estado guías rodadura' },
      { id: 'comp_gen2', text: 'Estado faldillas' },
      { id: 'comp_gen3', text: 'Estado lona rascadora' },
      { id: 'comp_gen4', text: 'Estado chapa y pintura (agujeros en chapa)' },
      { id: 'comp_gen5', text: 'Estado tolva' },
      { id: 'comp_gen6', text: 'Estado patas' },
      { id: 'comp_gen7', text: 'Estado brazos tensores' },
      { id: 'comp_gen8', text: '¿tiene alambres o soportes brazos tensores?' },
      { id: 'comp_gen9', text: 'Pegatinas riesgo eléctrico' },
      { id: 'comp_gen10', text: 'Pegatina inval' },
      { id: 'comp_gen11', text: 'Pegatina atrapamiento tolva' },
      { id: 'comp_gen12', text: 'Estado plato prensor' },
      { id: 'comp_gen13', text: 'Estado puertas/tapas alojamiento cilindros' },
      { id: 'comp_gen14', text: 'Estado protecciones botoneras' },
      { id: 'comp_gen15', text: '¿Los teflones están correctamente ajustados?' },
    ]
  },
  {
    category: 'Electricidad',
    items: [
      { id: 'comp_elec1', text: 'Estado botoneras (setas, pulsadores, etc)' },
      { id: 'comp_elec2', text: '¿Funciona correctamente los paros de emergencia?' },
      { id: 'comp_elec3', text: 'Estado seccionador candable' },
      { id: 'comp_elec4', text: 'Estado caja cuadro eléctrico' },
      { id: 'comp_elec5', text: 'Funcionamiento correcto de la maquina' },
      { id: 'comp_elec6', text: '¿la máquina para sola?' },
      { id: 'comp_elec7', text: '¿funciona correctamente el reset?' },
      { id: 'comp_elec8', text: 'Estado fotocélulas' },
      { id: 'comp_elec9', text: 'Funciona la luz de lleno' },
      { id: 'comp_elec10', text: 'Estado finales de carrera' },
    ]
  },
  {
    category: 'Hidráulica',
    items: [
      { id: 'comp_hidr1', text: '¿hay fugas de aceite?' },
      { id: 'comp_hidr2', text: 'Estado cilindros' },
      { id: 'comp_hidr3', text: 'Estado válvula inversora' },
      { id: 'comp_hidr4', text: '¿hace el cambio bien? (en caso de no hacer el cambio, problema inversora o cilindro, foto del causante)' },
      { id: 'comp_hidr5', text: '¿las presiones son correctas?' },
      { id: 'comp_hidr6', text: 'Estado aceite hidráulico' },
      { id: 'comp_hidr7', text: 'Estado filtro hidráulico' },
    ]
  }
];

// 3. Checklist para Prensa Vertical
export const prensaVerticalChecklist: ChecklistCategory[] = [
  {
    category: 'General',
    items: [
      { id: 'prensa_gen1', text: 'Estado plato prensor' },
      { id: 'prensa_gen2', text: 'Estado guias' },
      { id: 'prensa_gen3', text: 'Estado cierre puerta' },
      { id: 'prensa_gen4', text: 'Estado soporte fleje' },
      { id: 'prensa_gen5', text: 'Estado chapa y pintura (agujeros en chapa)' },
      { id: 'prensa_gen6', text: 'Pegatinas riesgo eléctrico' },
      { id: 'prensa_gen7', text: 'Pegatina inval' },
      { id: 'prensa_gen8', text: 'Pegatina atrapamiento' },
      { id: 'prensa_gen9', text: 'Estado protecciones botoneras' },
      { id: 'prensa_gen10', text: '¿Los teflones están correctamente ajustados?' },
      { id: 'prensa_gen11', text: 'Estado extractor de balas' },
      { id: 'prensa_gen12', text: '¿Tiene varilla para fleje?' },
    ]
  },
  {
    category: 'Electricidad',
    items: [
      { id: 'prensa_elec1', text: 'Estado botoneras (setas, pulsadores, etc)' },
      { id: 'prensa_elec2', text: '¿Funciona correctamente los paros de emergencia?' },
      { id: 'prensa_elec3', text: 'Estado clavija inversora' },
      { id: 'prensa_elec4', text: 'Estado seccionador candable' },
      { id: 'prensa_elec5', text: 'Estado caja cuadro eléctrico' },
      { id: 'prensa_elec6', text: 'Funcionamiento correcto de la maquina' },
      { id: 'prensa_elec7', text: '¿la máquina para sola?' },
      { id: 'prensa_elec8', text: 'Funciona la luz de lleno' },
      { id: 'prensa_elec9', text: 'Estados finales de carrera' },
      { id: 'prensa_elec10', text: '¿Tiene reset?' },
      { id: 'prensa_elec11', text: '¿funciona bien la función a dos manos?' },
    ]
  },
  {
    category: 'Hidráulica',
    items: [
      { id: 'prensa_hidr1', text: '¿hay fugas de aceite?' },
      { id: 'prensa_hidr2', text: 'Estado cilindros' },
      { id: 'prensa_hidr3', text: '¿La maquina no se baja sola?' },
      { id: 'prensa_hidr4', text: '¿las presiones son correctas?' },
      { id: 'prensa_hidr5', text: 'Sube y baja correctamente' },
    ]
  }
];

// 4. Checklist para Volteadores
export const volteadorChecklist: ChecklistCategory[] = [
  {
    category: 'General',
    items: [
      { id: 'volt_gen1', text: 'Estado uñas anticaida contenedor' },
      { id: 'volt_gen2', text: 'Estado protecciones' },
      { id: 'volt_gen3', text: 'Estado chapa y pintura (agujeros en chapa)' },
      { id: 'volt_gen4', text: 'Pegatinas riesgo eléctrico' },
      { id: 'volt_gen5', text: 'Pegatina inval' },
      { id: 'volt_gen6', text: 'Pegatina atrapamiento' },
      { id: 'volt_gen7', text: 'Estado protecciones botoneras' },
      { id: 'volt_gen8', text: '¿Los teflones están correctamente ajustados?' },
      { id: 'volt_gen9', text: 'Estado extractor de balas' },
      { id: 'volt_gen10', text: '¿Tiene varilla para fleje?' },
    ]
  },
  {
    category: 'Electricidad',
    items: [
      { id: 'volt_elec1', text: 'Estado botoneras (setas, pulsadores, etc)' },
      { id: 'volt_elec2', text: '¿Funciona correctamente los paros de emergencia?' },
      { id: 'volt_elec3', text: 'Estado clavija inversora' },
      { id: 'volt_elec4', text: 'Estado seccionador candable' },
      { id: 'volt_elec5', text: 'Estado caja cuadro eléctrico' },
      { id: 'volt_elec6', text: 'Funcionamiento correcto de la maquina' },
      { id: 'volt_elec7', text: '¿la máquina para sola?' },
      { id: 'volt_elec8', text: 'Funciona la luz de lleno' },
      { id: 'volt_elec9', text: 'Estados finales de carrera' },
      { id: 'volt_elec10', text: '¿Tiene reset?' },
      { id: 'volt_elec11', text: '¿funciona bien la función a dos manos?' },
    ]
  },
  {
    category: 'Hidráulica',
    items: [
      { id: 'volt_hidr1', text: '¿hay fugas de aceite?' },
      { id: 'volt_hidr2', text: 'Estado cilindros' },
      { id: 'volt_hidr3', text: '¿La maquina no se baja sola?' },
      { id: 'volt_hidr4', text: '¿las presiones son correctas?' },
      { id: 'volt_hidr5', text: 'Sube y baja correctamente' },
    ]
  }
];

// 5. Checklist para Rotoprensas
export const rotoprensaChecklist: ChecklistCategory[] = [
  {
    category: 'General',
    items: [
      { id: 'roto_gen1', text: 'Estado tambor' },
      { id: 'roto_gen2', text: 'Estado cierre puerta' },
      { id: 'roto_gen3', text: 'Estado chapa y pintura (agujeros en chapa)' },
      { id: 'roto_gen4', text: 'Pegatinas riesgo eléctrico' },
      { id: 'roto_gen5', text: 'Pegatina inval' },
      { id: 'roto_gen6', text: 'Pegatina atrapamiento' },
      { id: 'roto_gen7', text: 'Estado protecciones botoneras' },
      { id: 'roto_gen8', text: '¿Los teflones están correctamente ajustados?' },
      { id: 'roto_gen9', text: '¿Tiene anillo para bolsa?' },
    ]
  },
  {
    category: 'Electricidad',
    items: [
      { id: 'roto_elec1', text: 'Estado botoneras (setas, pulsadores, etc)' },
      { id: 'roto_elec2', text: '¿Funciona correctamente los paros de emergencia?' },
      { id: 'roto_elec3', text: 'Estado clavija inversora' },
      { id: 'roto_elec4', text: 'Estado seccionador candable' },
      { id: 'roto_elec5', text: 'Estado caja cuadro eléctrico' },
      { id: 'roto_elec6', text: 'Funcionamiento correcto de la maquina' },
      { id: 'roto_elec7', text: '¿la máquina para sola?' },
      { id: 'roto_elec8', text: 'Funciona la luz de lleno' },
      { id: 'roto_elec9', text: 'Estados finales de carrera' },
      { id: 'roto_elec10', text: '¿Tiene reset?' },
    ]
  },
  {
    category: 'Hidráulica',
    items: [
      { id: 'roto_hidr1', text: '¿hay fugas de aceite?' },
      { id: 'roto_hidr2', text: 'Estado cilindros' },
      { id: 'roto_hidr3', text: '¿La maquina no se baja sola?' },
      { id: 'roto_hidr4', text: '¿las presiones son correctas?' },
      { id: 'roto_hidr5', text: 'Sube y baja correctamente' },
      { id: 'roto_hidr6', text: 'Hace la inversión de giro el tambor' },
    ]
  }
];

// 6. Checklist para Cajas Estáticas
export const cajaEstaticaChecklist: ChecklistCategory[] = [
  {
    category: 'General',
    items: [
      { id: 'caja_gen1', text: 'Estado gancho' },
      { id: 'caja_gen2', text: 'Estado rodillos' },
      { id: 'caja_gen3', text: 'Estado vigas' },
      { id: 'caja_gen4', text: 'Estado carraca cierre' },
      { id: 'caja_gen5', text: 'Estado garras cierre puerta' },
      { id: 'caja_gen6', text: 'Estado puertas' },
      { id: 'caja_gen7', text: 'Estado soldadura 4 esquinas superiores' },
      { id: 'caja_gen8', text: 'Estado atacuerdas' },
      { id: 'caja_gen9', text: 'Estado escalones laterales' },
      { id: 'caja_gen10', text: 'Estado chapa y pintura' },
      { id: 'caja_gen11', text: '¿agujeros en chapas?' },
      { id: 'caja_gen12', text: 'Estado suelo' },
      { id: 'caja_gen13', text: 'Estado boca de carga' },
      { id: 'caja_gen14', text: '¿tiene cable seguridad puerta?' },
      { id: 'caja_gen15', text: '¿tiene sujeción puerta abierta?' },
      { id: 'caja_gen16', text: 'Tiene pegatinas seguridad' },
    ]
  }
];

// 7. Checklist para Contenedores
export const contenedorChecklist: ChecklistCategory[] = [
  {
    category: 'General',
    items: [
      { id: 'cont_gen1', text: 'Estado gancho' },
      { id: 'cont_gen2', text: 'Estado rodillos' },
      { id: 'cont_gen3', text: 'Estado vigas' },
      { id: 'cont_gen4', text: 'Estado cierre aproximación' },
      { id: 'cont_gen5', text: 'Estado puertas' },
      { id: 'cont_gen6', text: 'Estado soldadura 4 esquinas superiores' },
      { id: 'cont_gen7', text: 'Estado atacuerdas' },
      { id: 'cont_gen8', text: 'Estado escalones laterales' },
      { id: 'cont_gen9', text: 'Estado chapa y pintura' },
      { id: 'cont_gen10', text: '¿agujeros en chapas?' },
      { id: 'cont_gen11', text: 'Estado suelo' },
      { id: 'cont_gen12', text: '¿tiene cadenas seguridad puerta?' },
      { id: 'cont_gen13', text: '¿tiene sujeción puerta abierta?' },
      { id: 'cont_gen14', text: 'Tiene pegatinas seguridad' },
    ]
  }
];

// 8. Checklist para Rollopacker
export const rollopackerChecklist: ChecklistCategory[] = [
  {
    category: 'Brazo articulado',
    items: [
      { id: 'roll_brazo1', text: 'Engrasar bulones del brazo articulado y soporte' },
      { id: 'roll_brazo2', text: 'Comprobar correcto recorrido brazo articulado' },
      { id: 'roll_brazo3', text: 'Engrasar en los apoyos del cilindro' },
      { id: 'roll_brazo4', text: 'Comprobar desgaste de los bulones' },
    ]
  },
  {
    category: 'Electricidad',
    items: [
      { id: 'roll_elec1', text: 'Comprobación maniobra eléctrica. Dispone de un dispositivo que evita los arranques intempestivos. Tras un fallo de suministro, es preciso rearmar voluntariamente para que el equipo funcione' },
      { id: 'roll_elec2', text: 'Los órganos de accionamiento son adecuados y están bien señalizados' },
      { id: 'roll_elec3', text: 'Comprobar correcto funcionamiento de presostatos, finales de carrera y temporizadores' },
      { id: 'roll_elec4', text: 'Comprobar estado y funcionamiento del final de carrera presencia contenedor' },
      { id: 'roll_elec5', text: 'La instalación eléctrica está protegida del riesgo de contacto directo (mangueras alimentación en correcto estado)' },
      { id: 'roll_elec6', text: 'Limpieza y estanqueidad del armario eléctrico. No puede haber riesgo de contacto directo (aislamiento partes activas)' },
      { id: 'roll_elec7', text: 'Existen paros de emergencia con enclavamiento correctamente señalizados en cada una de las zonas de carga' },
      { id: 'roll_elec8', text: 'Dispone línea tierra. Comprobar continuidad a tierra de cuadro eléctrico y toda su estructura' },
      { id: 'roll_elec9', text: 'Reapretar conexiones del motor' },
      { id: 'roll_elec10', text: 'Desmontar protección ventilador motor y limpiar' },
      { id: 'roll_elec11', text: 'La zona de prensado debe estar protegida del contacto mecánico. El contenedor hace las funciones de barandilla siempre que esté situado a mínimo de 0,90 m por debajo de la cota máxima del contenedor' },
      { id: 'roll_elec12', text: 'Existe cartel de advertencia “riesgo eléctrico” en el cuadro eléctrico' },
      { id: 'roll_elec13', text: 'Debe tener un órgano de accionamiento que permite la parada total en condiciones de seguridad. Existe interruptor principal de consignación. Comprobar funcionamiento y estado del IPC' },
    ]
  },
  {
    category: 'Hidráulica',
    items: [
      { id: 'roll_hidr1', text: 'Estanqueidad del circuito hidráulico (latiguillos, válvulas, cilindro, bloque, motor hidráulico)' },
      { id: 'roll_hidr2', text: 'Comprobar el correcto funcionamiento del rodillo. Gira en ambos sentidos' },
      { id: 'roll_hidr3', text: 'Cuando el brazo está en posición elevada para realizar el cambio de contenedor, el brazo no debe bajar solo' },
      { id: 'roll_hidr4', text: 'Comprobar nivel de aceite' },
      { id: 'roll_hidr5', text: 'Comprobar estado mangueras hidráulicas' },
      { id: 'roll_hidr6', text: 'Comprobar estado aceite hidráulico de forma visual' },
      { id: 'roll_hidr7', text: 'Comprobar estado filtros de aceite y aire, cambiar si procede' },
      { id: 'roll_hidr8', text: 'Limpieza del radiador (si procede)' },
    ]
  },
  {
    category: 'General',
    items: [
      { id: 'roll_gen1', text: 'Estado de las protecciones laterales' },
      { id: 'roll_gen2', text: 'La máquina debe ser estable y adecuadamente fijada' },
    ]
  },
  {
    category: 'Ubicación',
    items: [
      { id: 'roll_ubi1', text: 'La zona de trabajo estará iluminada adecuadamente. Mínimo 100 lux' },
      { id: 'roll_ubi2', text: 'Si hay acceso a distinto nivel (por ejemplo ubicación en muelle de carga), deberá proveerse de protecciones y accesos adecuados (altura mínima de barandilla 0,90 m, con barra intermedia)' },
      { id: 'roll_ubi3', text: 'Dispone de extintor a una distancia máxima de 15 m, o en su defecto, de boca de incendio equipada (BIE) a una distancia máxima de 25 m' },
      { id: 'roll_ubi4', text: 'La acometida de abastecimiento eléctrico deberá disponer de su correspondiente protección diferencial' },
      { id: 'roll_ubi5', text: 'El establecimiento dispone de alimentación con 3 fases, neutro y tierra' },
    ]
  }
];

// Checklist para tipo "Otros" - Este será un checklist básico y genérico
export const otrosChecklist: ChecklistCategory[] = [
  {
    category: 'Estado General',
    items: [
      { id: 'gen1', text: 'Aspecto general y limpieza' },
      { id: 'gen2', text: 'Estructura y carcasa' },
      { id: 'gen3', text: 'Pintura y acabados' },
      { id: 'gen4', text: 'Etiquetas y placas de identificación' },
    ]
  },
  {
    category: 'Funcionalidad',
    items: [
      { id: 'func1', text: 'Funciones principales' },
      { id: 'func2', text: 'Controles y mandos' },
      { id: 'func3', text: 'Rendimiento general' },
    ]
  },
  {
    category: 'Seguridad',
    items: [
      { id: 'seg1', text: 'Protecciones y guardas' },
      { id: 'seg2', text: 'Sistemas de seguridad' },
      { id: 'seg3', text: 'Señalización de riesgos' },
    ]
  }
];

// Obtener el checklist correspondiente según el tipo de máquina
export const getChecklistByMachineType = (machineType: string): ChecklistCategory[] => {
  switch (machineType) {
    case 'compactador-estatico':
      return compactadorEstaticoChecklist;
    case 'contenedor':
      return contenedorChecklist;
    case 'autocompactador':
      return autocompactadorChecklist;
    case 'prensa-vertical':
      return prensaVerticalChecklist;
    case 'rollopacker':
      return rollopackerChecklist;
    case 'volteador':
      return volteadorChecklist;
    case 'rotoprensa':
      return rotoprensaChecklist;
    case 'caja-estatica':
      return cajaEstaticaChecklist;
    case 'otros':
      return otrosChecklist;
    default:
      return otrosChecklist;
  }
};
