function BulkInstanceUpdate() {

  this.$bulkUpdates = this.createBulkUpdateWidget();

  // only allow these types to be added to the cart
  this.SUPPORTED_JSONMODEL_TYPES = ['archival_object'];

  //this.updateSelectionSummary();
  this.setupTreeActions();

}

BulkInstanceUpdate.prototype.createBulkUpdateWidget = function() {
	var $bulkBtn = $(AS.renderTemplate("template_bulk_container_update_toolbar_action"));
	return $bulkBtn;
};

BulkInstanceUpdate.prototype.loadBulkUpdates = function($container, data, onComplete) {
  var self = this;
  var load_url = $container.data("load-url");

  if (typeof load_url == "undefined") {
    return;
  }

  $.post(load_url, {uri: data}, function(html) {
    $container.html(html);

    self.bindSummaryEvents($container);

    if (onComplete) {
      onComplete();
    }
  });
};

BulkInstanceUpdate.prototype.UrisToUpdate = function() {
  var uris = [];
  var $treeContainer = $('#tree-container');
  var items_to_update = $treeContainer.find('.multiselected-row');
  items_to_update = items_to_update.sort(function(a, b){
        return ($(b).find('.drag-annotation').text()) < ($(a).find('.drag-annotation').text()) ? 1 : -1;
  });
  items_to_update.each(function() {
    uris.push(CURRENT_REPO_URI + "/archival_objects/" + $(this).attr('id').split("_").pop());
  });
  return uris;
};

BulkInstanceUpdate.prototype.getResourceUri = function() {
  return CURRENT_REPO_URI + "/resources/" + $('#tree-container').find('tr.root-row').attr('id').split("_").pop();
};


BulkInstanceUpdate.prototype.setupBulkUpdatesEvents = function() {
  var self = this;
  
  self.$bulkUpdates.on("click", function(event) {
    event.preventDefault();
    var data = self.UrisToUpdate();
    var $modal = AS.openCustomModal("quickModal",
      AS.renderTemplate("template_bulk_container_update_dialog_title"),
      AS.renderTemplate("modal_quick_template", {
        message: AS.renderTemplate("template_bulk_container_update_dialog_contents", {
          selected: data,
          resource_uri: encodeURIComponent(self.getResourceUri())
        })
      }),
      "full");

    if ($modal.has("#bulkUpdatePane")) {
      self.loadBulkUpdates($("#bulkUpdatePane"),data);
    }

    $modal.find(".modal-footer").replaceWith(AS.renderTemplate("template_bulk_container_update_dialog_footer"));

    self.bindSummaryEvents($modal);
  });
};
  
BulkInstanceUpdate.prototype.setupTreeActions = function() {
	
	var self = this;
	var $treeToolbar = $("#tree-toolbar");
  $(document).on('loadedrecordform.aspace', function() {
    $treeToolbar.find('.btn-group').last().after(self.$bulkUpdates);
  });
  
  if ($treeToolbar.find('.drag-toggle').hasClass('btn-success')) {
    toggleBulkUpdatesBtn($treeToolbar.find('.drag-toggle'));
  }
  
  $treeToolbar.on('click', '.drag-toggle', function() {
    toggleBulkUpdatesBtn($(this));
  });
  
  self.setupBulkUpdatesEvents();
  
  function toggleBulkUpdatesBtn(el) {
    if (el.hasClass('btn-success')) {
      self.$bulkUpdates.show().prop('disabled',false);
    }
    else {
      self.$bulkUpdates.hide().prop('disabled',true);
    }    
  }
  
};


  //self.$bulkUpdates.on("click", "#cartSummaryDropdownBtn", function(event) {
  //  $("#cartSummaryDropdownPanel").find(".cart-summary").html(AS.renderTemplate("template_cart_dialog_contents", {
  //    selected: self.data
  //  }));
  //
  //  if ($.isEmptyObject(self.data)) {
  //    $("#cartSummaryDropdownPanel").find("button").addClass("disabled").attr("disabed", "disabled");
  //  } else {
  //    $("#cartSummaryDropdownPanel").find("button").removeClass("disabled").removeAttr("disabed");
  //  }
  //});

  //self.$bulkUpdates.on("click", ".bulk-updates-summary button", function(event) {
  //  event.preventDefault();
  //  event.stopPropagation();
  //});
  //
  //self.$bulkUpdates.on("click", ".clear-bulk-updates-btn", function() {
  //  self.clearSelection();
  //  location.reload();
  //});
//};

BulkInstanceUpdate.prototype.updateBulkUpdates = function(load_url, ao_uris, tc_uri, onComplete) {
  var self = this;

  if (typeof load_url == "undefined") {
    return;
  }
  console.log(load_url);
  console.log(ao_uris);
  console.log(tc_uri);
  $.post(load_url, {uri: ao_uris, tc_uri: tc_uri}, function(html) {

    if (onComplete) {
      onComplete();
    }
  });
};


BulkInstanceUpdate.prototype.bindSummaryEvents = function($container) {
  var self = this;

  $container.
    on("click", ".remove-from-bulk-updates-btn", function(event) {
      event.preventDefault();
      event.stopPropagation();

      var $btn = $(event.target).closest(".btn");
      var $tr = $btn.closest("tr");
      $tr.remove();
    }).
    on("click", ".clear-bulk-updates-btn", function(event) {
      event.preventDefault();
      event.stopPropagation();
      $(this).find('#bulkUpdatePane').children('tbody tr').remove();
    }).
    on("click", ".dartmouth_bulk_container_updates_update", function(event) {
      event.preventDefault();
      //event.stopPropagation();
      console.log($container.find('#dartmouth_update_bulk_containers_form'));
      $container.find('#dartmouth_update_bulk_containers_form').submit();
    }).
    on('submit','#dartmouth_update_bulk_containers_form', function(event) {
      event.preventDefault();
      event.stopPropagation();
      var load_uri = $('#dartmouth_update_bulk_containers_form').attr('action');
      var ao_uris = [];
      $('input[name="uri[]"]').each(function() {
        ao_uris.push($(this).val());
      });
      tc_uri = $('input[name="archival_record_children[children][0][instances][0][sub_container][top_container][ref]"]').val();
      self.updateBulkUpdates(load_uri, ao_uris, tc_uri);
    });

  // trigger a resize so the modal resizes to fit the container size
  $(window).trigger("resize");
}

BulkInstanceUpdate.prototype.insertOverlay = function() {
	var spinnerTop = window.innerHeight/2 - $('.spinner_for_cart').height();
    $("#archives_tree_overlay_for_cart_action").height('100%');
    $("#archives_tree_overlay_for_cart_action").siblings(".spinner_for_cart").show().css('top',spinnerTop);
  }
  
BulkInstanceUpdate.prototype.removeOverlay = function() {
    $("#archives_tree_overlay_for_cart_action").height('0%');
    $("#archives_tree_overlay_for_cart_action").siblings(".spinner_for_cart").hide().css('top','');
  }

$(function() {
  if (typeof CURRENT_REPO_URI == "undefined") {
    return;
  }

  AS.BulkInstanceUpdate = new BulkInstanceUpdate();
});
