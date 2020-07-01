function BulkInstanceUpdate(primaryKey, secondaryKey) {
  this.STORAGE_KEY = primaryKey;
  this.key = secondaryKey;
  this.$bulkUpdates = this.createBulkUpdateWidget();

  //this.LIMIT = this.$bulkUpdates.data("limit");

  var allData = AS.getData(this.STORAGE_KEY);
  if (allData == null) {
    // remove any existing keys from the storage
    // if user is new to this browser
    AS.flushData();
    allData = {};
  }
  this.data = allData[this.key] || [];

  // only allow these types to be added to the cart
  this.SUPPORTED_JSONMODEL_TYPES = ['archival_object'];

  this.setupBulkUpdatesEvents();
  this.updateSelectionSummary();
  this.setupTreeActions();
}

BulkInstanceUpdate.prototype.createBulkUpdateWidget = function() {
	var $bulkBtn = $(AS.renderTemplate("template_bulk_container_update_toolbar_action"));
	return $bulkBtn;
};


BulkInstanceUpdate.prototype.loadBulkUpdates = function($container, onComplete) {
  var self = this;

  var load_url = $container.data("load-url");

  if (typeof load_url == "undefined") {
    return;
  }

  $.post(load_url, {uri: self.data}, function(html) {
    $container.html(html);

    self.bindSummaryEvents($container);

    if (onComplete) {
      onComplete();
    }
  });
};


BulkInstanceUpdate.prototype.setupBulkUpdatesEvents = function() {
  var self = this;

  self.$bulkUpdates.on("click", ".show-bulk-updates-btn", function(event) {
    event.preventDefault();

    var $modal = AS.openCustomModal("quickModal",
      AS.renderTemplate("template_bulk_container_update_dialog_title"),
      AS.renderTemplate("modal_quick_template", {
        message: AS.renderTemplate("template_bulk_container_update_dialog_contents", {
          selected: self.data
        })
      }),
      "full");

    if ($modal.has("#bulkUpdatePane")) {
      self.loadCart($("#bulkUpdatePane", $modal));
    }

    $modal.find(".modal-footer").replaceWith(AS.renderTemplate("template_bulk_container_update_dialog_footer"));

    self.bindSummaryEvents($modal);
  });

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
};


BulkInstanceUpdate.prototype.bindSummaryEvents = function($container) {
  var self = this;

  $container.
    on("click", ".clear-bulk-updates-btn", function(event) {
      self.clearSelection();
      location.reload();
    }).
    on("click", ".remove-from-bullk-updates-btn", function(event) {
      event.stopPropagation();

      var $btn = $(event.target).closest(".btn");
      var $tr = $btn.closest("tr");
      self.removeFromSelection($btn.data("uri"));
      $tr.remove();
    });

  // trigger a resize so the modal resizes to fit the container size
  $(window).trigger("resize");
}


BulkInstanceUpdate.prototype.clearSelection = function() {
    var self = this;

  self.data = AS.setData(self.STORAGE_KEY, function(data) {
    if (data) {
      delete data[self.key];
    }

    return data;
  });

  self.updateSelectionSummary();
};


BulkInstanceUpdate.prototype.updateSelectionSummary = function() {
  var self = this;

  if ($.isEmptyObject(self.data)) {
    self.$bulkUpdates.find(".bulk-updates-count").html("0");
    self.bulkUpdatesIsNoLongerFull();
  } else {
    var size = 0;
    for (var _ in self.data) {
      size++
    }
    self.$bulkUpdates.find(".bulk-updates-count").html(size).removeClass("hide");
    if (size >= self.LIMIT) {
      self.raiseCartIsFull();
    } else {
      self.bulkUpdatesIsNoLongerFull();
    }
  }
};


BulkInstanceUpdate.prototype.removeFromSelection = function(uri) {
  var self = this;

  self.data = AS.setData(self.STORAGE_KEY, function(data) {
    if (data == null) {
      data = {};
    }
    if (!data.hasOwnProperty(self.key)) {
      data[self.key] = [];
    }

    if ($.inArray(uri, data[self.key]) >= 0) {
      data[self.key].splice($.inArray(uri, data[self.key]), 1);
    }

    return data;
  })[self.key] || [];

  if (self.$table && self.$table.length) {
    var $tr = self.$table.find("[data-uri='"+uri+"']");
    $tr.find(".add-to-bulk-updates-btn").removeClass("hide");
    $tr.find(".remove-from-bulk-updates-btn").addClass("hide");
  }

  self.updateSelectionSummary();
};

BulkInstanceUpdate.prototype.addURItoBulkUpdatesData = function(uri) {
  var self = this;

  self.data = AS.setData(self.STORAGE_KEY, function(data) {
    if (data == null) {
      data = {};
    }

    if (!data.hasOwnProperty(self.key)) {
      data[self.key] = [];
    }

    if ($.inArray(uri, data[self.key]) < 0) {
      data[self.key].push(uri);
    }

    return data;
  })[self.key];
};

BulkInstanceUpdate.prototype.addToSelection = function(uri, record_type) {
  var self = this;
  if ($.inArray(record_type, self.SUPPORTED_JSONMODEL_TYPES) < 0) {
    return;
  }

  self.addURItoBulkUpdatesData(uri);
  self.updateSelectionSummary();
};

BulkInstanceUpdate.prototype.isSelected = function(uri) {
  return $.inArray(uri, this.data || []) >= 0;
}

BulkInstanceUpdate.prototype.setupTreeActions = function() {
	
	var self = this;
	var $treeContainer = $("#tree-toolbar");
	$(document).on('loadedrecordform.aspace', function() {
				console.log($treeContainer);
	console.log(self.$bulkUpdates);
	$treeContainer.find('.btn-group').last().after(self.$bulkUpdates);
	});

};



BulkInstanceUpdate.prototype.setupTreePageActions = function() {
  var self = this;
  var $tree = $("#tree-container");
  var $treeContainer = $tree.siblings("#tree-toolbar");

	var spinnerOverlay = AS.renderTemplate("template_cart_add_children_overlay");
	$('.container-fluid .content-pane').prepend(spinnerOverlay);

  function toggleCartActions(uri) {
    if (self.isSelected(uri)) {
      $treeContainer.find(".add-to-cart-btn").addClass("hide");
      $treeContainer.find(".remove-from-cart-btn").removeClass("hide");
    } else {
      $treeContainer.find(".add-to-cart-btn").removeClass("hide");
      $treeContainer.find(".remove-from-cart-btn").addClass("hide");
    }
    if (localStorage["as-cart-children"+uri]) {
			$treeContainer.find(".add-to-cart-with-children").addClass("hide");
			$treeContainer.find(".remove-from-cart-with-children").removeClass("hide");
		}
  }

  function uriForNode($node) {
    if ($node.attr("id")) {
    	var type = self.parseNodeId($node.attr("id"));
      return CURRENT_REPO_URI + "/" + type + "s/" + $node.attr('id').replace(type + '_','');
    }
  };

  function setupTreeToolbar() {
    var $node = $(".current", $tree);
    if ($node.hasClass("new")) {
      // nothing to do as item is new
      return;
    }
    
    // remove any existing cart buttons
    $treeContainer.find(".cart-actions").remove();

    var uri = uriForNode($node);

    var actions = AS.renderTemplate("template_cart_actions");
    $treeContainer.prepend(actions);
		if ($.inArray(self.parseNodeId($(".current").attr("id")), self.SUPPORTED_JSONMODEL_TYPES_FOR_CHILDREN) < 0) {
			self.hideChildrenAction();
			self.buttonGroupCSS();
		}

    toggleCartActions(uri);
  };
  
  //wait for the ao to load before firing the toolbar build
	$(document).on('dartmouth_ao_loaded_event', function() {
		setupTreeToolbar();
	});
	
  $treeContainer.
    on("click", ".add-to-cart-btn", function(event) {
      var $node = $tree.find(".current");
      var uri = uriForNode($node);
      self.addToSelection(uri, self.parseNodeId($node.attr("id")));
      toggleCartActions(uri);
    }).
    on("click", ".remove-from-cart-btn", function(event) {
      var $node = $tree.find(".current");
      var uri = uriForNode($node);

      self.removeFromSelection(uri)

      toggleCartActions(uri);
    }).
    on("click", ".cart-plus-children-btn", function(event) {
    	$(".cart-actions .btn-group button").attr("disabled","disabled");
      var $node = $tree.find(".current");
      var uri = uriForNode($node);
    	self.addWithChildrenToSelection(uri, self.parseNodeId($node.attr("id")));
    	$treeContainer.find(".add-to-cart-with-children").addClass("hide");
			$treeContainer.find(".remove-from-cart-with-children").removeClass("hide");
      toggleCartActions(uri);
    }).
     on("click", ".cart-minus-children-btn", function(event) {
      var $node = $tree.find(".current");
      var uri = uriForNode($node);
    	self.removeWithChildrenFromSelection(uri);
    	$treeContainer.find(".add-to-cart-with-children").removeClass("hide");
			$treeContainer.find(".remove-from-cart-with-children").addClass("hide");
      toggleCartActions(uri);
    });
};

BulkInstanceUpdate.prototype.parseNodeId = function(node) {
	if (node) {
		var nodeParts = node.split("_");
		nodeParts.pop();
		return nodeParts.join("_");
	}
}


BulkInstanceUpdate.prototype.addAllToSelection = function(uris) {
  var self = this;
  new_uris = [];
  // remove any location fragment from uri string
  $.each(uris, function(k,v) {
    if (!v.substring(0, v.indexOf('#'))) {
      new_uris.push(v);
    }
  });
  function uniquify(array) {
    var tmp_hash = {}, result=[];
    for(var i = 0; i < array.length; i++)
    {
      if (!tmp_hash[array[i]])
      {
        tmp_hash[array[i]] = true;
        result.push(array[i]);
      }
    }
    return result;
  };

  var newData = uniquify([].concat(self.data.concat(new_uris)));

  if (newData.length > self.LIMIT) {
    // raise too big! and slice to LIMIT
    newData = newData.slice(0, self.LIMIT);
  }

  self.data = AS.setData(self.STORAGE_KEY, function(data) {
    if (data == null) {
      data = {};
    }

    data[self.key] = newData;

    return data;
  })[self.key];

  self.updateSelectionSummary();

  // toggle all cart buttons to be added
  $(".add-to-cart-btn").addClass("hide");
  $(".remove-from-cart-btn").removeClass("hide");
}


BulkInstanceUpdate.prototype.setupAddAllFromSearchAction = function() {
  var self = this;
  var $searchTable = $("#tabledSearchResults"); // use .record-pane in v150

  if ($searchTable.length == 0) {
    // no search results on this page
    return;
  }

  var $action = $(AS.renderTemplate("template_cart_add_all_action"));
  $searchTable.before($action); // use prepend instead of before in v150

  $action.click(function() {
    $action.find(".loading").removeClass("hide");
    self.insertOverlay();
    $action.prop("disabled", "disabled");
    $.getJSON("/plugins/component_report/uris_for_search" + location.search, function(json) {
      self.addAllToSelection(json);
      $action.find(".loading").remove();
      $action.removeClass("btn-info").addClass("btn-success");
      $action.find(".action-text").remove();
      $action.find(".success-text").removeClass("hide");
      self.removeOverlay();
    });
  });
};

BulkInstanceUpdate.prototype.buttonGroupCSS = function () {
	$(".remove-from-cart-btn").addClass("cart-non-btn-group");
}

BulkInstanceUpdate.prototype.hideChildrenAction = function () {
	$(".add-to-cart-with-children, .remove-from-cart-with-children").hide();
	var borderRadius = $(".add-to-cart-btn").css("border-top-left-radius");
	$(".add-to-cart-btn").css("border-radius", borderRadius);
	$(".remove-from-cart-btn").css("border-radius", borderRadius);
}

BulkInstanceUpdate.prototype.raiseBulkUpdatesIsFull = function() {
  this.$bulkUpdates.find(".btn.show-bulk-updates-btn").addClass("btn-danger");
};

BulkInstanceUpdate.prototype.bulkUpdatesIsNoLongerFull = function() {
  this.$bulkUpdates.find(".btn.show-bulk-updates-btn.btn-danger").removeClass("btn-danger");
};

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
  if (typeof CURRENT_REPO_URI == "undefined" || typeof CURRENT_USER_HASH == "undefined") {
    return;
  }

  AS.BulkInstanceUpdate = new BulkInstanceUpdate(CURRENT_USER_HASH, CURRENT_REPO_URI);
});

// Add API for storing to LocalStorage
AS.getData = function(key) {
  return $.jStorage.get(key);
};
AS.setData = function(key, mutator) {
  var data = AS.getData(key);
  var updated = mutator(data);

  $.jStorage.set(key, updated);

  return updated;
};
AS.flushData = function() {
  $.jStorage.flush();
};