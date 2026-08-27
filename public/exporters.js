(function (global) {
  "use strict";

  function texto(v){return String(v==null?"":v).trim();}
  function arr(v){return Array.isArray(v)?v:[];}
  function safeName(v){return texto(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[<>:"/\\|?*\x00-\x1F]/g," ").replace(/\s+/g," ").trim().slice(0,140)||"archivo";}

  function textCell(v){return {t:"s",v:String(v==null?"":v)};}
  function sheetFromRows(headers, rows){
    var aoa=[headers.map(textCell)];
    rows.forEach(function(r){aoa.push(headers.map(function(h){return textCell(r[h]);}));});
    var ws=global.XLSX.utils.aoa_to_sheet(aoa);
    Object.keys(ws).forEach(function(k){if(k[0]!=="!"){ws[k].t="s";ws[k].v=String(ws[k].v==null?"":ws[k].v);}});
    ws["!cols"]=headers.map(function(h){return {wch:h.toLowerCase().includes("descripcion")?70:22};});
    return ws;
  }

  function descargarBase(detalle){
    var b=detalle.peaBase||{};
    var rows=[];
    rows.push({codigoComponente:"1",ordenComponente:"1",descripcionComponente:texto(b.descripcion),descripcionComponente2:"",descripcionComponente3:""});
    rows.push({codigoComponente:"2",ordenComponente:"1",descripcionComponente:texto(b.objetivo),descripcionComponente2:"",descripcionComponente3:""});
    arr(b.unidadesBase).sort(function(a,c){return Number(a.unidadNumero)-Number(c.unidadNumero);}).forEach(function(u){
      var n=String(u.unidadNumero||"");
      rows.push({codigoComponente:"3",ordenComponente:n,descripcionComponente:texto(u.nombre),descripcionComponente2:"",descripcionComponente3:""});
      rows.push({codigoComponente:"4",ordenComponente:n,descripcionComponente:texto(u.competencia),descripcionComponente2:"",descripcionComponente3:""});
      rows.push({codigoComponente:"5",ordenComponente:n,descripcionComponente:texto(u.resultadoAprendizaje),descripcionComponente2:"",descripcionComponente3:""});
    });
    arr(b.bibliografia).forEach(function(x,i){rows.push({codigoComponente:"8",ordenComponente:String(x.orden||i+1),descripcionComponente:texto(x.referencia),descripcionComponente2:texto(x.codigoReferencia),descripcionComponente3:texto(x.justificacion)});});
    var headers=["codigoComponente","ordenComponente","descripcionComponente","descripcionComponente2","descripcionComponente3"];
    var wb=global.XLSX.utils.book_new(); global.XLSX.utils.book_append_sheet(wb,sheetFromRows(headers,rows),"PEA Base");
    global.XLSX.writeFile(wb,safeName((detalle.materia&&detalle.materia.archivos&&detalle.materia.archivos.base&&detalle.materia.archivos.base.nombre)||("PEA Base - "+(detalle.materia.nombreMostrar||detalle.materia.nombre||"Materia")+".xlsx")),{cellText:true});
  }

  function descargarUnidades(detalle){
    var rows=arr(detalle.unidades).sort(function(a,b){return Number(a.unidadNumero)-Number(b.unidadNumero);}).map(function(u){return {ordenComponente:String(u.unidadNumero||""),descripcionComponente:arr(u.contenidos).map(texto).filter(Boolean).join("\n")};});
    var headers=["ordenComponente","descripcionComponente"];
    var wb=global.XLSX.utils.book_new(); global.XLSX.utils.book_append_sheet(wb,sheetFromRows(headers,rows),"PEA Unidades");
    global.XLSX.writeFile(wb,safeName((detalle.materia&&detalle.materia.archivos&&detalle.materia.archivos.unidades&&detalle.materia.archivos.unidades.nombre)||("PEA Unidades - "+(detalle.materia.nombreMostrar||detalle.materia.nombre||"Materia")+".xlsx")),{cellText:true});
  }

  function descargarActividades(detalle){
    var rows=arr(detalle.actividades).map(function(a){return {nivel:String(a.unidadNumero||a.nivel||""),mecanismo:texto(a.mecanismo||a.tipoActividad),tema:texto(a.tema),descripcion:texto(a.descripcion)};});
    var headers=["nivel","mecanismo","tema","descripcion"];
    var wb=global.XLSX.utils.book_new(); global.XLSX.utils.book_append_sheet(wb,sheetFromRows(headers,rows),"PEA Actividades");
    global.XLSX.writeFile(wb,safeName((detalle.materia&&detalle.materia.archivos&&detalle.materia.archivos.actividades&&detalle.materia.archivos.actividades.nombre)||("PEA Actividades - "+(detalle.materia.nombreMostrar||detalle.materia.nombre||"Materia")+".xlsx")),{cellText:true});
  }

  function escapeHtml(v){return texto(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
  function listHtml(v){var items=Array.isArray(v)?v:texto(v).split(/\n+/);items=items.map(texto).filter(Boolean);return items.length?"<ul>"+items.map(function(x){return "<li>"+escapeHtml(x)+"</li>";}).join("")+"</ul>":"<p>Sin información registrada.</p>";}
  function campoAlias(campos, needles){campos=campos||{};var keys=Object.keys(campos);for(var i=0;i<keys.length;i++){var n=keys[i].normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();if(needles.some(function(x){return n.includes(x);})&&texto(campos[keys[i]])) return texto(campos[keys[i]]);}return "";}

  function fichaHtml(ficha, detalles){
    var c=ficha.contexto||{}; var inputs=ficha.inputs||{}; var corr=ficha.correlaciones||{}; var bib=[];var seen={};
    detalles.forEach(function(d){arr(d.peaBase&&d.peaBase.bibliografia).forEach(function(b){var r=texto(b.referencia);var k=r.toLowerCase();if(r&&!seen[k]){seen[k]=1;bib.push(r);}});});
    var html='<div class="pdf-doc"><h1>Ficha individual de análisis por nivel, Construcción Curricular Continua<br>Carrera de '+escapeHtml(c.carreraNombre)+'</h1>';
    html+='<h2>1. Datos de identificación</h2><table><tbody>'+
      '<tr><th>Carrera</th><td>'+escapeHtml(c.carreraNombre)+'</td></tr><tr><th>Nivel analizado</th><td>'+escapeHtml(c.nivelNombre)+'</td></tr><tr><th>Período</th><td>'+escapeHtml(c.periodo)+'</td></tr><tr><th>Código</th><td>'+escapeHtml(c.codigoDocumento)+'</td></tr><tr><th>Coordinador</th><td>'+escapeHtml(c.coordinador)+'</td></tr><tr><th>Docentes</th><td>'+escapeHtml(c.docentes).replace(/\n/g,"<br>")+'</td></tr><tr><th>Fecha de inicio</th><td>'+escapeHtml(c.fechaInicio)+'</td></tr><tr><th>Fecha de finalización</th><td>'+escapeHtml(c.fechaFin)+'</td></tr><tr><th>Elaborado por</th><td>'+escapeHtml(c.elaboradoPor)+'</td></tr><tr><th>Revisado por</th><td>'+escapeHtml(c.revisadoPor)+'</td></tr><tr><th>Aprobado por</th><td>'+escapeHtml(c.aprobadoPor)+'</td></tr></tbody></table>';
    html+='<h2>2. Objetivo</h2><p>'+escapeHtml(ficha.objetivoFicha)+'</p><h2>3. Análisis de INPUTS</h2>';
    [{id:"graduados",n:"Seguimiento a graduados y egresados"},{id:"titulacion",n:"Titulación y eficiencia terminal"},{id:"vinculacion",n:"Vinculación con la sociedad"},{id:"practicas",n:"Prácticas preprofesionales"}].forEach(function(t){var r=inputs[t.id]||{};html+='<h3>'+escapeHtml(t.n)+'</h3>';html+=r.noAplica?'<p><strong>No aplica.</strong> '+escapeHtml(r.justificacionNoAplica)+'</p>':'<p>'+escapeHtml(r.analisis)+'</p>';if(r.codigoInforme||r.periodoInforme)html+='<p><small>Fuente: '+escapeHtml([r.codigoInforme,r.periodoInforme].filter(Boolean).join(" · "))+'</small></p>';});
    html+='<h2>4. Correlación del análisis de INPUTS con las asignaturas de '+escapeHtml(String(c.nivelNombre||"").toLowerCase())+'</h2>';
    detalles.forEach(function(d){var id=d.materia.id;var r=corr[id]||{};html+='<h3>'+escapeHtml(d.materia.nombreMostrar||d.materia.nombre)+'</h3><p>'+escapeHtml(r.analisis)+'</p><p><strong>Estado curricular:</strong> '+escapeHtml(r.estadoCurricular||"Mantener")+'</p>';});
    html+='<h2>5. Disgregación de contenido micro curricular por asignatura</h2>';
    detalles.forEach(function(d,i){var m=d.materia||{},b=d.peaBase||{},ub=arr(b.unidadesBase),units=arr(d.unidades),acts=arr(d.actividades);html+='<h3>'+(i+1)+'. '+escapeHtml(m.nombreMostrar||m.nombre)+'</h3>';html+='<p><strong>I. Descripción de la asignatura</strong></p><p>'+escapeHtml(b.descripcion)+'</p>';html+='<p><strong>II. Resultado de aprendizaje que contribuye al perfil de egreso</strong></p><p>'+escapeHtml(campoAlias(b.campos,["perfil egreso","resultado perfil","resultado_aprendizaje_perfil"])||"No se encontró un campo específico diferenciado en el PEA cargado.")+'</p>';html+='<p><strong>III. Objetivo general de la asignatura</strong></p><p>'+escapeHtml(b.objetivo)+'</p>';html+='<p><strong>IV. Unidades de aprendizaje</strong></p>'+listHtml(ub.map(function(u){return (u.unidadNumero?u.unidadNumero+". ":"")+texto(u.nombre);}));html+='<p><strong>V. Competencias específicas</strong></p>'+listHtml(ub.map(function(u){return u.competencia;}));html+='<p><strong>VI. Resultados de aprendizaje</strong></p>'+listHtml(ub.map(function(u){return u.resultadoAprendizaje;}));html+='<p><strong>VII. Software y simuladores</strong></p><p>'+escapeHtml(campoAlias(b.campos,["software","simulador","herramienta tecnolog"])||"No se encontró un campo específico de software/simuladores en el PEA cargado.")+'</p>';html+='<p><strong>VIII. Bibliografía</strong></p>';if(arr(b.bibliografia).length){html+='<table><thead><tr><th>Bibliografía</th><th>Justificación</th></tr></thead><tbody>'+b.bibliografia.map(function(x){return '<tr><td>'+escapeHtml(x.referencia)+'</td><td>'+escapeHtml(x.justificacion)+'</td></tr>';}).join("")+'</tbody></table>';}else html+='<p>Sin bibliografía registrada.</p>';html+='<p><strong>IX. Desarrollo secuencial de la asignatura</strong></p>';units.forEach(function(u){html+='<h4>Unidad '+escapeHtml(u.unidadNumero)+(u.titulo?': '+escapeHtml(u.titulo):'')+'</h4>'+listHtml(arr(u.contenidos));var ua=acts.filter(function(a){return Number(a.unidadNumero)===Number(u.unidadNumero);});if(ua.length)html+='<p><strong>Actividades</strong></p><ul>'+ua.map(function(a){return '<li><strong>'+escapeHtml(a.mecanismo||a.tipoActividad||"Actividad")+':</strong> '+escapeHtml(a.tema)+(a.descripcion?' — '+escapeHtml(a.descripcion):'')+'</li>';}).join("")+'</ul>';});});
    html+='<h2>6. Extractos específicos de cambio</h2><p>Los cambios curriculares aplicados quedan registrados en el historial de versiones de cada materia.</p><h2>7. Conclusiones</h2>'+listHtml(ficha.conclusiones)+'<h2>8. Recomendaciones</h2>'+listHtml(ficha.recomendaciones)+'<h2>9. Bibliografía</h2>'+listHtml(bib)+'</div>';
    return html;
  }

  async function generarPDF(ficha,detalles){
    var host=document.createElement("div");host.style.position="fixed";host.style.left="-100000px";host.style.top="0";host.innerHTML='<style>.pdf-doc{font-family:Arial,sans-serif;color:#111;font-size:10.5pt;line-height:1.38}.pdf-doc h1{text-align:center;font-size:16pt}.pdf-doc h2{font-size:13pt;margin-top:18pt}.pdf-doc h3{font-size:11.5pt;margin-top:14pt}.pdf-doc h4{font-size:10.5pt}.pdf-doc table{width:100%;border-collapse:collapse;margin:8pt 0}.pdf-doc th,.pdf-doc td{border:1px solid #777;padding:5pt;vertical-align:top}.pdf-doc p{margin:5pt 0}.pdf-doc ul{margin-top:4pt}</style>'+fichaHtml(ficha,detalles);document.body.appendChild(host);
    var filename=safeName("Ficha - "+ficha.contexto.carreraNombre+" - "+ficha.contexto.nivelNombre+" - "+ficha.contexto.periodo)+".pdf";
    var opt={margin:[10,10,10,10],filename:filename,image:{type:"jpeg",quality:.98},html2canvas:{scale:1.5,useCORS:true},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:["css","legacy"],avoid:["tr","table"]}};
    var worker=global.html2pdf().set(opt).from(host.querySelector(".pdf-doc"));
    var blob=await worker.outputPdf("blob");
    await worker.save();
    host.remove();
    return {blob:blob,nombreArchivo:filename};
  }

  global.CCCExport={descargarBase:descargarBase,descargarUnidades:descargarUnidades,descargarActividades:descargarActividades,generarPDF:generarPDF,fichaHtml:fichaHtml};
})(window);
