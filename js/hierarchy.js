/**
 * Specchio lato client di server/hierarchy.js.
 * Le chiavi (key) DEVONO restare identiche a quelle nel backend.
 * Le etichette non sono qui: arrivano da js/lang/*.json sotto "roles.<key>".
 */
const HIERARCHY = [
  { key: "dirigente",            family: "Dirigente",      order: 1,  isDirezione: true  },
  { key: "chirurgo_primario",    family: "Chirurgo",       order: 2,  isDirezione: true  },
  { key: "chirurgo_vice",        family: "Chirurgo",       order: 3,  isDirezione: false },
  { key: "chirurgo_strutturato", family: "Chirurgo",       order: 4,  isDirezione: false },
  { key: "chirurgo_special",     family: "Chirurgo",       order: 5,  isDirezione: false },
  { key: "medico_ambulatorio",   family: "Medico",         order: 6,  isDirezione: false },
  { key: "medico_laboratorio",   family: "Medico",         order: 7,  isDirezione: false },
  { key: "medico_base",          family: "Medico",         order: 8,  isDirezione: false },
  { key: "inf_coordinatore",     family: "Infermiere",     order: 9,  isDirezione: false },
  { key: "inf_equipe",           family: "Infermiere",     order: 10, isDirezione: false },
  { key: "inf_assistente",       family: "Infermiere",     order: 11, isDirezione: false },
  { key: "param_coord_ps",       family: "Paramedico",     order: 12, isDirezione: false },
  { key: "param_senior",         family: "Paramedico",     order: 13, isDirezione: false },
  { key: "paramedico",           family: "Paramedico",     order: 14, isDirezione: false },
  { key: "specializzando",       family: "Specializzando", order: 15, isDirezione: false },
];

function gradeLabel(key) { return I18N.t(`roles.${key}`); }
