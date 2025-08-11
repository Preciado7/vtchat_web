this["Handlebars"] = this["Handlebars"] || {};
this["Handlebars"]["templates"] = this["Handlebars"]["templates"] || {};

this["Handlebars"]["templates"]["message"] = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing;

  return "<div class=\"bubble-container\">\r\n    <div class=\"bubble\">\r\n        "
    + ((stack1 = (helpers.nl2br || (depth0 && depth0.nl2br) || alias2).call(alias1,(depth0 != null ? depth0.text : depth0),{"name":"nl2br","hash":{},"data":data})) != null ? stack1 : "")
    + "\r\n    </div>\r\n</div>\r\n<div class=\"date\">"
    + container.escapeExpression((helpers.formatChatDate || (depth0 && depth0.formatChatDate) || alias2).call(alias1,(depth0 != null ? depth0.date : depth0),{"name":"formatChatDate","hash":{},"data":data}))
    + "</div>";
},"useData":true});