const BRAND={name:"VORTX",tagline:"Recuperación de la Masculinidad",year:(new Date).getFullYear()},

GATE_DATA={
  headline:"Tu cuerpo ya no responde como antes de los 35 — y no es la edad.",
  subheadline:"Un médico de Washington descubrió la causa real y el método casero que la revierte en 60 días. Haz el test de 2 minutos y descubre tu nivel exacto.",
  cta:"EMPEZAR EL DIAGNÓSTICO",
  timerStrip:"Test anónimo de 2 minutos. El resultado te va a sorprender.",
  socialProof:"17.483 hombres ya revertieron. Resultado promedio: 18 días.",
  privacySeal:"100% confidencial • Anónimo • Nadie lo sabrá",
  badge:"Método validado por 17.483 hombres en 14 países"
},

PHASES=[
  {id:1,label:"VALIDACIÓN",steps:[1,2]},
  {id:2,label:"PERFIL",steps:[3,4]},
  {id:3,label:"SÍNTOMAS",steps:[5,6,7,8,9]},
  {id:4,label:"HÁBITOS",steps:[10]},
  {id:5,label:"VEREDICTO",steps:[11,12]}
],

STEPS=[
  {
    id:1,phase:1,type:"single-select",
    question:"Vamos a ser honestos por 10 segundos.",
    microcopy:"¿Notas que tu cuerpo ya no responde como antes de los 35?",
    options:[
      {value:"si_molesta",label:"Sí, y me molesta más de lo que admito",icon:"💭"},
      {value:"si_activo",label:"Sí, y por eso estoy aquí",icon:"🎯"},
      {value:"si_empezando",label:"Sí, está empezando y quiero actuar antes",icon:"⚡"}
    ],
    weight:0
  },
  {
    id:2,phase:1,type:"single-select",
    question:"El 73% de los hombres mayores de 35 tiene esto — y los médicos no lo detectan.",
    microcopy:"El problema no es hormonal. Es 3 veces más común de lo que dicen. ¿Lo sabías?",
    options:[
      {value:"no_sabia",label:"No, nunca lo había escuchado",icon:"🧐"},
      {value:"sospechaba",label:"Sospechaba algo así",icon:"🔍"},
      {value:"quiero_saber",label:"Quiero saber qué es exactamente",icon:"🔓"}
    ],
    triggers:{
      "no_sabia":"🛑 Eso es exactamente lo que las farmacéuticas no quieren que sepas. Sigue — vas a entender.",
      "sospechaba":"⚡ Tu intuición está correcta. El test va a confirmar exactamente qué está pasando en tu cuerpo.",
      "quiero_saber":"🔥 Bien. Responde las próximas preguntas con honestidad — el diagnóstico depende de eso."
    },
    weight:0
  },
  {
    id:3,phase:2,type:"text-input",
    question:"¿Cómo debo llamarte?",
    microcopy:"Necesito tu nombre para que el diagnóstico tenga sentido para ti.",
    field:{name:"userName",placeholder:"Tu primer nombre...",maxLength:30},
    weight:0
  },
  {
    id:4,phase:2,type:"single-select",
    question:"{name}, ¿cuántos años tienes?",
    microcopy:"La velocidad del daño cambia brutalmente de una franja a otra.",
    options:[
      {value:"35-39",label:"35 a 39 años",icon:"⚠️"},
      {value:"40-44",label:"40 a 44 años",icon:"⚠️"},
      {value:"45-49",label:"45 a 49 años",icon:"🚨"},
      {value:"50-54",label:"50 a 54 años",icon:"🚨"},
      {value:"55-59",label:"55 a 59 años",icon:"🛑"},
      {value:"60-65",label:"60 a 65 años",icon:"🛑"}
    ],
    triggers:{
      "35-39":"⚠ {name}, la mayoría se da cuenta después de los 40. Tú lo estás descubriendo antes — eso cambia todo.",
      "40-44":"⚠ {name}, a esta edad el cuerpo ya empezó a reducir el flujo. En 3 años no lo vas a reconocer.",
      "45-49":"🚨 {name}, el flujo ya cayó a la mitad y el encogimiento ya es visible — pero todavía tiene solución.",
      "50-54":"🛑 {name}, después de los 50 el cuerpo perdió la mitad de su capacidad. Existe una forma de revertirlo.",
      "55-59":"🛑 Franja crítica, {name}. Los vasos se están cerrando mes a mes — pero tú todavía estás aquí.",
      "60-65":"🛑 Situación grave. Vasos casi bloqueados, pero hombres de 63 años ya revertieron con el protocolo."
    },
    weight:0
  },
  {
    id:5,phase:3,type:"single-select",
    question:"{name}, ¿qué es lo que más te corroe?",
    microcopy:"Nadie lo va a ver. Solo tú y yo.",
    options:[
      {value:"libido",label:"Perdió tamaño, firmeza o los dos",icon:"🔥"},
      {value:"cuerpo",label:"Barriga creció, músculo desapareció",icon:"⚖️"},
      {value:"energia",label:"Sin energía, destruido cada día",icon:"⚡"},
      {value:"mental",label:"Sin fuego, sin ganas de nada",icon:"🧠"}
    ],
    weight:0
  },
  {
    id:6,phase:3,type:"single-select",
    question:"¿Cuándo fue la última vez que amaneciste con erección sin necesitar nada?",
    microcopy:"Erección matinal fuerte = sangre llegando con presión. Si paró, el problema ya está avanzado.",
    options:[
      {value:"siempre",label:"Cada día, sin falta",icon:"✅",score:3},
      {value:"raro",label:"Rara vez, solo con suerte",icon:"⚠️",score:1},
      {value:"nunca",label:"Hace años que no me pasa",icon:"🛑",score:0}
    ],
    triggers:{
      nunca:"🛑 {name}, sin erección matinal los vasos están bloqueados. Por eso parece más pequeño. El protocolo revierte eso.",
      raro:"⚠ {name}, vasos comprometidos — la sangre llega pero sin presión: tamaño reducido, firmeza débil."
    },
    weight:20,category:"libido"
  },
  {
    id:7,phase:3,type:"single-select",
    question:"En el momento de la verdad, ¿cómo te va?",
    microcopy:"Sin excusas. ¿Qué pasa cuando tienes que rendir?",
    options:[
      {value:"toro",label:"Duro de principio a fin, siempre",icon:"💪",score:3},
      {value:"falho",label:"No se mantiene o necesito la pastilla",icon:"🚨",score:0},
      {value:"fujo",label:"Lo evito, le tengo miedo al fracaso",icon:"🏃",score:0}
    ],
    triggers:{
      fujo:"🛑 {name}, huirle a tu pareja destruye a un hombre por dentro. Cuanto más huyes, peor se pone. Pero hay salida.",
      falho:"🚨 La sangre entra pero no se queda — vasos débiles. El protocolo corrige exactamente eso."
    },
    weight:15,category:"libido"
  },
  {
    id:8,phase:3,type:"multi-select",
    question:"Mírate ahora, {name}. ¿Qué ves?",
    microcopy:"Cada kilo de barriga fabrica hormona femenina y le roba sangre al pene.",
    minSelections:1,
    options:[
      {value:"barriga",label:"Barriga grande, dura o blanda",icon:"⚖️"},
      {value:"peito",label:"Pecho hinchado, parecido a senos",icon:"🍎"},
      {value:"braco",label:"Brazos delgados, sin músculo",icon:"📏"},
      {value:"rosto",label:"Cara hinchada, sin estructura",icon:"🌝"},
      {value:"nenhuma",label:"Ninguna de esas — estoy bien",icon:"✅"}
    ],
    triggers:{
      _any_except_nenhuma:"🛑 {name}, esa grasa fabrica hormona femenina dentro de ti ahora mismo. Es lo que encoge, ablanda y te quita el control."
    },
    weight:10,category:"cuerpo",scoreLogic:"count-negative"
  },
  {
    id:9,phase:3,type:"single-select",
    question:"¿Ya necesitaste la pastilla azul para funcionar?",
    microcopy:"Cada vez que la usas, tu cuerpo aprende a no funcionar solo.",
    options:[
      {value:"nao",label:"Nunca la necesité",icon:"🚫",score:3},
      {value:"asvezes",label:"Ya la usé o la tengo por si acaso",icon:"💊",score:1},
      {value:"viciado",label:"Sin ella, ya ni lo intento",icon:"🚨",score:0}
    ],
    triggers:{
      viciado:"🛑 {name}, tu cuerpo creó dependencia. Sin la pastilla, nada funciona. Pero se puede reactivar sin química.",
      asvezes:"⚠ Tenerla 'por si acaso' es el primer paso para volverse rehén. En 2 años, sin ella, nada va a responder."
    },
    weight:10,category:"fisica"
  },
  {
    id:10,phase:4,type:"multi-select",
    question:"{name}, ¿cuáles de estos hábitos tienes?",
    microcopy:"Cada uno de estos cierra los vasos que alimentan el pene por dentro.",
    minSelections:1,
    options:[
      {value:"alcool",label:"Tomo alcohol todas las semanas",icon:"🍺"},
      {value:"cigarro",label:"Fumo o fumé por años",icon:"🚬"},
      {value:"remedio",label:"Medicación crónica (presión, etc.)",icon:"💊"},
      {value:"sedentario",label:"Sin ejercicio hace meses",icon:"🛋️"},
      {value:"nenhum",label:"Ninguno de esos",icon:"✅"}
    ],
    triggers:{
      _any_except_nenhum:"🛑 {name}, cada uno de esos hábitos cierra los vasos del pene. Cuantos más marcaste, más bloqueado estás."
    },
    weight:8,category:"habitos",scoreLogic:"count-negative"
  },
  {
    id:11,phase:5,type:"whatsapp-input",
    question:"Ya casi, {name}. ¿A dónde te envío tu resultado?",
    microcopy:"Tu diagnóstico es personal. Te lo mando directo a tu celular.",
    field:{name:"whatsapp",placeholder:"+52 000 000 0000"},
    optIn:{text:"Acepto recibir mi diagnóstico y contenido exclusivo por WhatsApp"},
    privacySeal:"🔒 Tu número no será compartido con nadie. Total confidencialidad.",
    weight:0
  },
  {
    id:12,phase:5,type:"single-select",
    question:"Última pregunta, {name}. ¿Por quién estás haciendo esto?",
    microcopy:"Eso cambia el enfoque de tu protocolo.",
    options:[
      {value:"parceira",label:"Por mi pareja. Quiero volver a la altura",icon:"💑"},
      {value:"eu_mesmo",label:"Por mí. Quiero sentirme hombre de nuevo",icon:"🦾"},
      {value:"tudo",label:"Por todo — quiero mi vida de vuelta",icon:"🔥"},
      {value:"confianza",label:"Por los dos. Quiero mi cuerpo y confianza",icon:"💪"}
    ],
    weight:0
  }
],

LOADING_DATA={
  headline:"Analizando el mapa vascular de {name}...",
  duration:12e3,
  messages:[
    "Cruzando tus síntomas con la base de datos...",
    "Midiendo el grado de bloqueo vascular...",
    "Identificando tu ventana de reversión...",
    "Calculando pérdida estimada de tamaño y firmeza...",
    "Comparando con 17.483 diagnósticos anteriores...",
    "Esto va a cambiar lo que creías saber sobre tu cuerpo...",
    "Preparando tu protocolo personalizado..."
  ]
},

RESULT_DATA={
  headlineTemplate:"El diagnóstico de {name} está listo.",
  scoreZones:[
    {
      min:0,max:35,
      label:"COMPROMETIDO",
      color:"#C44B4B",
      description:"Tus vasos están severamente bloqueados — la sangre no llega al pene: tamaño reducido, firmeza cero, duración de segundos. Pero existe un protocolo que fuerza a la sangre a volver."
    },
    {
      min:36,max:60,
      label:"EN DECLIVE",
      color:"#D4940A",
      description:"Tus vasos se están cerrando. Ya perdiste tamaño visible y la duración bajó. Todavía se puede revertir, pero la ventana se está cerrando."
    },
    {
      min:61,max:80,
      label:"EN RIESGO SILENCIOSO",
      color:"#C9A84C",
      description:"Tus vasos todavía funcionan pero ya están perdiendo eficiencia. Sin intervención, la caída va a acelerar en los próximos 12 meses — y cuando lo notes, será más difícil revertir."
    },
    {
      min:81,max:100,
      label:"EN RIESGO SILENCIOSO",
      color:"#C9A84C",
      description:"Tu sistema aún responde, pero los factores de riesgo ya están activos. Sin protocolo, la caída acelera en los próximos 12 meses. El momento de actuar es ahora, no después."
    }
  ],
  criticalAreas:{
    libido:{label:"Flujo Peniano",icon:"🍆"},
    cuerpo:{label:"Grasa Estrogénica",icon:"⚖️"},
    energia:{label:"Nivel de Energía",icon:"⚡"},
    sueno:{label:"Calidad del Sueño",icon:"🌙"},
    fisica:{label:"Dependencia Química",icon:"💊"},
    habitos:{label:"Hábitos Destructivos",icon:"🔄"},
    saude:{label:"Riesgo Medicamentoso",icon:"🏥"}
  }
},

BRIDGE_DATA={cta:"VER MI PROTOCOLO DE REVERSIÓN"},

PROTOCOL_DATA={
  headline:"El Protocolo de Reversión Vascular, Diseñado para Tu Caso",
  subheadline:"Sin cirugía, sin pastillas, sin bomba: el método que destapa los vasos y hace volver la sangre con presión total.",
  features:[
    {
      icon:"🍆",
      title:"Vasos reabiertos en 21 días — tamaño de vuelta",
      desc:"Tu pene está más pequeño porque la sangre no llega. El protocolo destapa los vasos y restaura el volumen perdido. Diferencia visible sin pastilla, sin cirugía."
    },
    {
      icon:"⏱️",
      title:"Duras 3 veces más — sin terminar antes",
      desc:"El protocolo fortalece el músculo PC y regula el flujo. Resultado: tú decides cuándo terminas — no tu cuerpo."
    },
    {
      icon:"🔩",
      title:"Erección natural, sin la pastilla azul",
      desc:"Tus vasos se reabren y la sangre llena el pene con la presión que tenías cuando tenías 25 años. Sin química, sin dependencia."
    },
    {
      icon:"🔥",
      title:"Deseo de predador — ganas que no paran",
      desc:"Cuando los vasos abren y las hormonas se equilibran, el deseo vuelve como una ola. Tu pareja lo siente antes que tú."
    }
  ],
  seal:"Protocolo generado en base a tu diagnóstico: acceso restringido",
  cta:"VER EL PRECIO DE MI PROTOCOLO"
},

TESTIMONIALS=[
  {
    initials:"César M.",age:52,occupation:"Dueño de Constructora, Ciudad de México",
    photo:"https://i.pravatar.cc/80?img=70",
    text:"15 días de protocolo y mi esposa me preguntó qué diablos estaba tomando. Volví a funcionar como si tuviera 30.",
    result:"Funcionó en 15 días",highlight:"+ Tamaño y firmeza restaurados",
    painTags:["parceira","tudo","confianza"]
  },
  {
    initials:"Roberto Q.",age:44,occupation:"Inversionista, Bogotá",
    photo:"https://i.pravatar.cc/80?img=69",
    text:"Mi pene había encogido y terminaba en 2 minutos. Era vascular — el protocolo me devolvió centímetros y control total.",
    result:"Tamaño y duración de vuelta",highlight:"+ Control total restaurado",
    painTags:["parceira","eu_mesmo","tudo"]
  },
  {
    initials:"Sergio O.",age:60,occupation:"Ex-Militar, Guadalajara",
    photo:"https://i.pravatar.cc/80?img=66",
    text:"60 años. Dependía de la pastilla. Hoy amanezco con erección fuerte, sin necesitar nada. El tamaño volvió a mis 40.",
    result:"Sin pastilla a los 60 años",highlight:"+ Vasos reabiertos naturalmente",
    painTags:["parceira","eu_mesmo","tudo"]
  },
  {
    initials:"Marcos T.",age:48,occupation:"Camionero, Monterrey",
    photo:"https://i.pravatar.cc/80?img=65",
    text:"3 semanas de protocolo y mi esposa volvió al cuarto. Hoy aguanto toda la noche.",
    result:"Duración triplicada",highlight:"+ Energía restaurada",
    painTags:["parceira","tudo"]
  },
  {
    initials:"Ricardo F.",age:55,occupation:"Abogado, Medellín",
    photo:"https://i.pravatar.cc/80?img=64",
    text:"Terminaba en 1 minuto. Hoy controlo cuándo quiero y mi esposa pide más.",
    result:"De 1 minuto a 40+",highlight:"+ Control de eyaculación",
    painTags:["eu_mesmo","parceira","tudo"]
  },
  {
    initials:"Pablo S.",age:41,occupation:"Empresario, Ciudad de México",
    photo:"https://i.pravatar.cc/80?img=63",
    text:"60 días: la barriga se fue, el pecho desapareció y el tamaño volvió visiblemente. Mi esposa no lo podía creer.",
    result:"Cuerpo y tamaño restaurados",highlight:"+ Estrógeno eliminado",
    painTags:["eu_mesmo","tudo","confianza"]
  },
  {
    initials:"Andrés L.",age:49,occupation:"Ingeniero, Cali",
    photo:"https://i.pravatar.cc/80?img=55",
    text:"30 días de protocolo: mi esposa me miró y dijo '¿qué te pasó?'. Volví a ser yo.",
    result:"Reversión en 30 días",highlight:"+ Circulación reabierta",
    painTags:["eu_mesmo","parceira","tudo","confianza"]
  },
  {
    initials:"Felipe R.",age:53,occupation:"Médico, Lima",
    photo:"https://i.pravatar.cc/80?img=52",
    text:"Soy médico y no podía resolver mi propio problema. Este protocolo hizo lo que 5 años de consultas no lograron.",
    result:"Funcionó donde la medicina falló",highlight:"+ Enfoque vascular comprobado",
    painTags:["eu_mesmo","parceira","tudo"]
  },
  {
    initials:"Jonathan P.",age:46,occupation:"Profesor, Buenos Aires",
    photo:"https://i.pravatar.cc/80?img=18",
    text:"El protocolo abrió los vasos y la sangre volvió con presión. Mi pareja lo notó en la primera semana.",
    result:"Resultado visible en 7 días",highlight:"+ Flujo restaurado",
    painTags:["parceira","tudo"]
  },
  {
    initials:"Gilberto A.",age:58,occupation:"Empresario, Santiago",
    photo:"https://i.pravatar.cc/80?img=17",
    text:"3 semanas: duro como toro, duración que ella nunca había visto. No quiere salir de la cama.",
    result:"Firmeza y duración de toro",highlight:"+ Rendimiento total",
    painTags:["parceira","eu_mesmo","tudo"]
  },
  {
    initials:"Carlos V.",age:43,occupation:"Policía, Ciudad de México",
    photo:"https://i.pravatar.cc/80?img=11",
    text:"Antes terminaba antes de empezar. Hoy controlo y duro lo que quiero. VORTX salvó mi matrimonio.",
    result:"Eyaculación bajo control",highlight:"+ Rendimiento restaurado",
    painTags:["eu_mesmo","tudo","confianza"]
  },
  {
    initials:"Daniel M.",age:37,occupation:"Desarrollador, Bogotá",
    photo:"https://i.pravatar.cc/80?img=12",
    text:"Tenía 37 y creía que era demasiado joven para esto. 3 semanas y la firmeza volvió con fuerza total.",
    result:"Revertido a los 37",highlight:"+ Vasos reabiertos a tiempo",
    painTags:["eu_mesmo","tudo","confianza"]
  },
  {
    initials:"Héctor M.",age:61,occupation:"Jubilado, Guadalajara",
    photo:"https://i.pravatar.cc/80?img=3",
    text:"61 años. 5 años sin funcionar. 3 semanas de protocolo — volví con tamaño, firmeza y duración. Ella lloró.",
    result:"Revertió todo a los 61",highlight:"+ 5 años de daño revertidos",
    painTags:["parceira","eu_mesmo","tudo"]
  }
];

function getFilteredTestimonials(e){
  const o=TESTIMONIALS.filter(o=>o.painTags&&o.painTags.includes(e));
  return[...o.length>=3?o:TESTIMONIALS].sort(()=>Math.random()-.5).slice(0,3)
}

const PRICING_DATA={
  urgencyText:"Este precio desaparece en:",
  timerMinutes:8,
  checkoutCtaMap:{
    parceira:"QUIERO RECUPERAR MI RELACIÓN AHORA",
    eu_mesmo:"QUIERO RECUPERARME A MÍ MISMO",
    tudo:"QUIERO MI VIDA DE VUELTA",
    confianza:"QUIERO MI CONFIANZA DE VUELTA",
    _default:"EMPEZAR AHORA"
  },
  plans:[
    {
      id:"esencial",
      name:"ACCESO ESENCIAL",
      price:9,
      originalPrice:97,
      period:"pago único",
      description:"Módulo vascular básico únicamente",
      badge:"",
      ctaLabel:"QUIERO EL ACCESO ESENCIAL",
      ctaTag:"VERSIÓN BÁSICA",
      isAnchor:true,
      features:[
        "Protocolo vascular básico — módulo 1 únicamente",
        "Sin módulo de duración ni control avanzado",
        "Sin protocolo de sueño hormonal",
        "Sin guía de eliminación de grasa estrogénica",
        "Sin actualizaciones futuras incluidas"
      ]
    },
    {
      id:"vitalicio",
      name:"PROTOCOLO COMPLETO — ACCESO DE POR VIDA",
      price:17,
      originalPrice:197,
      period:"pago único, acceso de por vida",
      description:"El protocolo completo de reversión vascular",
      badge:"🔓 MEJOR OPCIÓN",
      ctaLabel:"QUIERO EL PROTOCOLO COMPLETO",
      ctaTag:"ACCESO TOTAL",
      features:[
        "Vasos reabiertos en 21 días — tamaño y firmeza sin pastilla",
        "Durar 3 veces más — control total de eyaculación",
        "Erección matinal de vuelta — sin dependencia química",
        "Eliminación de grasa estrogénica — cuerpo que vuelve a responder",
        "Protocolo de sueño profundo — producción hormonal nocturna",
        "Acceso de por vida — todas las actualizaciones incluidas"
      ]
    }
  ],
  guarantee:{
    title:"30 días de prueba. Si no funciona, devuelvo todo — sin preguntas.",
    text:"Sigue el protocolo por 30 días. Si tu tamaño, tu firmeza y tu duración no mejoran de forma visible, devuelvo el 100% de tu dinero. Sin preguntas, sin burocracia. El riesgo es todo mío.",
    icon:"🛡️"
  },
  paymentMethods:["Tarjeta de Crédito • PayPal • Pago 100% Seguro 🔒"]
},

THANKYOU_DATA={
  headline:"Bienvenido al otro lado, {name}.",
  subheadline:"El protocolo de reversión vascular está liberado — a partir de ahora cada día cuenta.",
  steps:[
    {number:"01",title:"Acceso llega en menos de 5 minutos",desc:"El link llega a tu WhatsApp en cuanto se confirme el pago."},
    {number:"02",title:"Empieza por el Protocolo Vascular (Módulo 1)",desc:"Es la base de todo: sin destapar los vasos, nada funciona. Léelo hoy."},
    {number:"03",title:"Sigue exactamente como está escrito",desc:"Va a parecer demasiado simple — no cambies nada. Ahí está el resultado."},
    {number:"04",title:"No le cuentes a nadie, deja que el resultado hable",desc:"En 2-3 semanas tu pareja va a ser la primera en notarlo."}
  ],
  cta:"ACCEDER AL PROTOCOLO AHORA"
};
