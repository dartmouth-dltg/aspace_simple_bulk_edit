$(function() {
  
   if (typeof CURRENT_REPO_URI == "undefined") {
    return;
  }
  
  // setup the toolbar button and actions
  var simpleBulkEditBtnArr = {
    label: 'Simple Bulk Edit <span class="caret"></span>',
    cssClasses: 'btn-default dropdown-toggle',
    groupClasses: 'dropdown',
    onRender: function(btn, node, tree, toolbarRenderer) {
      var $options = $('<ul>').addClass('dropdown-menu ');
      var $liEnable = $('<li>');
      $liEnable.append($('<a>').attr('href', 'javascript:void(0);').
                          addClass('simple-bulk-edit-enable').
                          text('Enable'));
      $options.append($liEnable);
      var $liUpdate = $('<li>');
      $liUpdate.append($('<a>').attr('href', 'javascript:void(0);').
                          addClass('simple-bulk-edit-open').
                          text('Update'));
      $options.append($liUpdate);
      $options.appendTo(btn.closest('.btn-group'));
      $options.on('click', '.simple-bulk-edit-enable', function() {
        $(tree.large_tree.elt).toggleClass('drag-enabled');
        $(this).toggleClass('simple-bulk-edit-enabled');
      });
      $options.on('click', '.simple-bulk-edit-open', function() {
        setupSimpleBulkEditsEvents();
      });
      
      btn.attr('data-toggle', 'dropdown');
    },
    onClick: function(event, btn, node, tree, toolbarRenderer) {
    },
    isEnabled: function(node, tree, toolbarRenderer) {
        return true;
    },
    isVisible: function(node, tree, toolbarRenderer) {
        return !tree.large_tree.read_only;
    },
    onFormLoaded: function(btn, form, tree, toolbarRenderer) {
        $(btn).removeClass('disabled');
    },
    onToolbarRendered: function(btn, toolbarRenderer) {
        $(btn).addClass('disabled');
    },
  }
  
  if (typeof(TreeToolbarConfiguration) !== 'undefined') {
    var res = TreeToolbarConfiguration["resource"];
    var arch = TreeToolbarConfiguration["archival_object"];
    TreeToolbarConfiguration["resource"] = [].concat(res).concat([simpleBulkEditBtnArr]);
    TreeToolbarConfiguration["archival_object"] = [].concat(arch).concat([simpleBulkEditBtnArr]);
  }
  
  // setup and render the modal
  var setupSimpleBulkEditsEvents = function() {
    if (!$('#tree-container').hasClass('drag-enabled')) {
      alert("Please select 'Enable' to simple bulk edit.");
    }
    else {
      var data = urisToUpdate();
      var $modal = AS.openCustomModal("quickModal",
        AS.renderTemplate("template_aspace_simple_bulk_edit_dialog_title"),
        AS.renderTemplate("modal_quick_template", {
          message: AS.renderTemplate("template_aspace_simple_bulk_edit_dialog_contents", {
            selected: data,
            resource_uri: encodeURIComponent(getResourceUri())
          })
        }),
        "full");
  
      if ($modal.has("#bulkUpdatePane")) {
        loadSimpleBulkEdits($("#bulkUpdatePane"),data);
      }
  
      $modal.find(".modal-footer").replaceWith(AS.renderTemplate("template_aspace_simple_bulk_edit_dialog_footer"));
  
      bindSummaryEvents($modal);
    }
  };
  
  // get the uris to update
  var urisToUpdate = function() {
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
  
  // get the resource uri
  var getResourceUri = function() {
    return CURRENT_REPO_URI + "/resources/" + $('#tree-container').find('tr.root-row').attr('id').split("_").pop();
  };
  
  // get the new top container uri
  var findGlobalTcUri = function($container) {
    return $container.find('#bulkUpdateContainerTypeahead').find('input[name="archival_record_children[children][0][instances][0][sub_container][top_container][ref]"]').val();
  };
  
  // get the ao tc uri
  // if the uri for that ao is not filled, default to the global tc
  var findAoTcUri = function($container, el) {
    ao_tc_uri = el.parent().siblings('.aspace-simple-bulk-edit-summary-new-container').find('input[name*="[instances][0][sub_container][top_container][ref]"]').val();

    if (typeof ao_tc_uri === 'undefined'){
      if ($container.find('#aspace-simple-bulk-edit-use-global-tc').is(':checked')) {
        ao_tc_uri = findGlobalTcUri($container);
      }
      else {
        ao_tc_uri = "";
      }
    }
    
    return ao_tc_uri;
  };
  
  // update the options - ao uris, tc uri, load uri
  var updateSimpleBulkEditsOptions = function($container) {
    var simpleBulkEditsOptions = {};
    simpleBulkEditsOptions.load_uri = $('#aspace_simple_bulk_edit_form').attr('action');
    simpleBulkEditsOptions.aos = FindAoData($container);
    
    return simpleBulkEditsOptions;
  };
  
  // find the ao uris
  var FindAoData = function($container) {
    aos = [];
    $container.find('input[name^="uri_"]').each(function() {
      ao = {
        uri: $(this).val(),
        title: $(this).parent().siblings('.aspace-simple-bulk-edit-summary-title').children('input').val(),
        tc_uri: findAoTcUri($container, $(this)),
        child_indicator: $(this).parent().siblings('.aspace-simple-bulk-edit-summary-child-indicator').children('input').val()
      };
      aos.push(ao);
    });
    return aos;
  };
  
  // fill the child indicators
  var fillIndicators = function($container) {
    if (!isNaN($container.find('#child_ind_start').val())) {
      start_indicator = parseInt($container.find('#child_ind_start').val());
      // fill the indicators in order
      $container.find('.aspace-simple-bulk-edit-summary-child-indicator').each(function(index, v) {
        var new_indicator = index + start_indicator;
        $(this).children('input').val(new_indicator);
      });
    }
    else {
      alert('Please enter a number to start from.');
    }
  };
  
  // load the updates into the modal pane
  var loadSimpleBulkEdits = function($container, data, onComplete) {
    var load_url = $container.data("load-url");
  
    if (typeof load_url === 'undefined') {
      return;
    }
  
    $.post(load_url, {uri: data}, function(html) {
      $container.html(html);
      $container.find(".linker:not(.initialised)").linker();
      $container.find('.input-group.date').datepicker();
      bindSummaryEvents($container);
      
      if (onComplete) {
        onComplete();
      }
    });
  };
  
  // do the updates
  var updateSimpleBulkEdits = function($container, onComplete) {
  
    simpleBulkEditsOptions = updateSimpleBulkEditsOptions($container);

    if (validate($container, simpleBulkEditsOptions)) {
      $container.find('.alert').remove();

      $.post(simpleBulkEditsOptions.load_uri, {uri:  JSON.stringify(simpleBulkEditsOptions.aos)}, function(json) {
        if (json.length > 0) {
          simpleBulkEditsAlert($container, "success");
          $container.modal('toggle');
          window.location.reload();
        }
        else simpleBulkEditsAlert($container, "danger");
        
        if (onComplete) {
          onComplete();
        }
      });
    }
    else {
      simpleBulkEditsAlert($container, "warning");
    }
  };
  
  // alerts if things aren't ready or go wrong
  var simpleBulkEditsAlert = function($container, alert_type) {
    
    var alert_template = AS.renderTemplate("template_aspace_simple_bulk_edit_alert", {
        alert_type: alert_type
      });
    if ($container.find('div.alert').length > 0) {
      $container.find('div.alert').replaceWith(alert_template);
    }
    else $container.find('.modal-body').prepend(alert_template);
  
  };
  
  // validate each entry
  // Rules
  // 1. the title must not be empty
  // 2. If the use global tc is checked, then the global tc uri must have a value
  // we must have a valid load_uri
  var validate = function($container, options) {
    var valid = true;
    
    // check the load_uri
    if (options.load_uri.length < 1) {
      valid = false;
    }
    
    // check each ao data set - specifically the title
    // aos are structured like {load_uri: LOAD_URI aos: {{URI1 => {title => TITLE, tc_uri => TC_URI, child_indicator => CHILD_IND}, URI2 => {}}}
    $(options.aos).each(function(k,v) {
      if (v.title.replace(/\s+/g,"").length < 1) {
        $container.find('tr[data-uri="'+v.uri+'"] .aspace-simple-bulk-edit-summary-title input').addClass('bg-danger');
        valid = false;
      }
    });
    
    // check the global tc_uri
    if ($container.find('#aspace-simple-bulk-edit-use-global-tc').is(':checked') && typeof findGlobalTcUri($container) === 'undefined') {
      $container.find('#aspace-simple-bulk-edit-use-global-tc').parent('label').addClass('bg-danger');
      valid = false;
    }

    // remove any validation warnings
    if (valid) {
      $container.find('#aspace-simple-bulk-edit-use-global-tc').parent('label').removeClass('bg-danger');
      $container.find('.aspace-simple-bulk-edit-summary-title input').removeClass('bg-danger');
    }
    
    return valid;
  };
  
  // events in the modal - the good stuff
  var bindSummaryEvents = function($container) {
  
    $container.
      // remove and ao from the list
      on("click", ".remove-from-bulk-updates-btn", function(event) {
        event.preventDefault();
        event.stopPropagation();
  
        var $btn = $(event.target).closest(".btn");
        var $tr = $btn.closest("tr");
        $tr.remove();
      }).
      // clear everything
      on("click", ".clear-bulk-updates-btn", function(event) {
        event.preventDefault();
        event.stopPropagation();
        $(this).find('#bulkUpdatePane').children('tbody tr').remove();
      }).
      // fill
      on('click', '#aspace-simple-edit-fill-indicators', function(event) {
        event.preventDefault();
        event.stopPropagation();
        fillIndicators($container);
      }).
      // update
      on("click", ".aspace_simple_bulk_edits_update", function(event) {
        event.preventDefault();
        event.stopPropagation();
        $container.find('#aspace_simple_bulk_edit_form').submit();
      }).
      // submit handler
      on('submit','#aspace_simple_bulk_edit_form', function(event) {
        event.preventDefault();
        event.stopPropagation();
        updateSimpleBulkEdits($container);
      });
    
    // trigger a resize so the modal resizes to fit the container size
    $(window).trigger("resize");
  };
  
});
