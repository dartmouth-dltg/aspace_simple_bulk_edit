$(function() {
  
   if (typeof CURRENT_REPO_URI == "undefined") {
    return;
  }
  
  // setup the toolbar button and actions
  var bulkInstanceBtnArr = {
    label: 'Bulk Update <span class="caret"></span>',
    cssClasses: 'btn-default dropdown-toggle',
    groupClasses: 'dropdown',
    onRender: function(btn, node, tree, toolbarRenderer) {
      var $options = $('<ul>').addClass('dropdown-menu ');
      var $liEnable = $('<li>');
      $liEnable.append($('<a>').attr('href', 'javascript:void(0);').
                          addClass('bulk-update-enable').
                          text('Enable'));
      $options.append($liEnable);
      var $liUpdate = $('<li>');
      $liUpdate.append($('<a>').attr('href', 'javascript:void(0);').
                          addClass('bulk-update-open').
                          text('Update'));
      $options.append($liUpdate);
      $options.appendTo(btn.closest('.btn-group'));
      $options.on('click', '.bulk-update-enable', function() {
        $(tree.large_tree.elt).toggleClass('drag-enabled');
        $(this).toggleClass('bulk-enabled');
      });
      $options.on('click', '.bulk-update-open', function() {
        setupBulkUpdatesEvents();
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
    TreeToolbarConfiguration["resource"] = [].concat(res).concat([bulkInstanceBtnArr]);
    TreeToolbarConfiguration["archival_object"] = [].concat(arch).concat([bulkInstanceBtnArr]);
  }
  
  // setup and render the modal
  var setupBulkUpdatesEvents = function() {
    if (!$('#tree-container').hasClass('drag-enabled')) {
      alert("Please select 'Enable' to bulk update");
    }
    else {
      var data = urisToUpdate();
      var $modal = AS.openCustomModal("quickModal",
        AS.renderTemplate("template_bulk_container_update_dialog_title"),
        AS.renderTemplate("modal_quick_template", {
          message: AS.renderTemplate("template_bulk_container_update_dialog_contents", {
            selected: data,
            resource_uri: encodeURIComponent(getResourceUri())
          })
        }),
        "full");
  
      if ($modal.has("#bulkUpdatePane")) {
        loadBulkUpdates($("#bulkUpdatePane"),data);
      }
  
      $modal.find(".modal-footer").replaceWith(AS.renderTemplate("template_bulk_container_update_dialog_footer"));
  
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
  var findTcUri = function($container) {
    return $container.find('input[name="archival_record_children[children][0][instances][0][sub_container][top_container][ref]"]').val();
  };
  
  // update the options - ao uris, tc uri, load uri
  var updateBulkUpdateOptions = function($container, bulkUpdateOptions) {
    bulkUpdateOptions.load_uri = $('#dartmouth_update_bulk_containers_form').attr('action');
    bulkUpdateOptions.ao_uris = findAoUris($container);
    bulkUpdateOptions.tc_uri = findTcUri($container);
    
    return bulkUpdateOptions;
  };
  
  // find the ao uris
  var findAoUris = function($container) {
    var ao_uris = {};
    $container.find('input[name^="uri_"]').each(function() {
      ao_uris[$(this).val()] = $(this).parent().siblings('.component-report-summary-title').children('input').val();
    });
    return ao_uris;
  };
  
  // load the updates into the modal pane
  var loadBulkUpdates = function($container, data, onComplete) {
    var load_url = $container.data("load-url");
  
    if (typeof load_url == "undefined") {
      return;
    }
  
    $.post(load_url, {uri: data}, function(html) {
      $container.html(html);
  
      bindSummaryEvents($container);
  
      if (onComplete) {
        onComplete();
      }
    });
  };
  
  // do the updates
  var updateBulkUpdates = function($container, load_url, ao_uris, tc_uri, onComplete) {
  
    if (typeof load_url == "undefined") {
      return;
    }
    var child_ind_start = $('#child_ind_start').val();
    $.post(load_url, {uri:  JSON.stringify(ao_uris), tc_uri: tc_uri, child_ind_start: child_ind_start}, function(json) {
      if (json.length > 0) {
        bulkUpdatesAlert($container, "success");
        $container.modal('toggle');
        window.location.reload();
      }
      else bulkUpdatesAlert($container, "danger");
      
      if (onComplete) {
        onComplete();
      }
    });
  };
  
  // preview the updates
  var previewBulkUpdates = function($container, ao_uris, tc_num) {
  
    if (typeof ao_uris == "undefined" || typeof tc_num == "undefined") {
      return;
    }
    
    var child_ind_start = parseInt($container.find('#child_ind_start').val(), 10);
    $.each(ao_uris, function(k,v) {
      $('tr[data-uri="' + v + '"]').find('.component-report-summary-box-container').text(tc_num + ' (preview)');
      if (!isNaN(child_ind_start)) {
        var indicator = k + child_ind_start;
        $('tr[data-uri="' + v + '"]').find('.component-report-summary-file-container').text(indicator + ' (preview)');
      }
    });
    
  };
  
  // alerts if things aren't ready or go wring
  var bulkUpdatesAlert = function($container, alert_type) {
    
    var alert_template = AS.renderTemplate("template_bulk_container_update_alert", {
        alert_type: alert_type
      });
    if ($container.find('div.alert').length > 0) {
      $container.find('div.alert').replaceWith(alert_template);
    }
    else $container.find('.modal-body').prepend(alert_template);
  
  };
  
  // events in the modal - the good stuff
  var bindSummaryEvents = function($container) {
    
    var bulkUpdateOptions = {};
  
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
      // preview the update
      on("click", ".dartmouth_bulk_container_updates_preview", function(event) {
        event.preventDefault();
        event.stopPropagation();
        updateBulkUpdateOptions($container, bulkUpdateOptions);
        if (bulkUpdateOptions.tc_uri !== undefined && bulkUpdateOptions.ao_uris.length > 0 && bulkUpdateOptions.load_uri.length > 0) {
          $container.find('.alert').remove();
          previewBulkUpdates($container, bulkUpdateOptions.ao_uris, $('.top_container.has-popover.initialised').text());
        }
        else {
          bulkUpdatesAlert($container, "warning");
        }
      }).
      // update
      on("click", ".dartmouth_bulk_container_updates_update", function(event) {
        event.preventDefault();
        event.stopPropagation();
        $container.find('#dartmouth_update_bulk_containers_form').submit();
      }).
      // submit handler
      on('submit','#dartmouth_update_bulk_containers_form', function(event) {
        event.preventDefault();
        event.stopPropagation();
        updateBulkUpdateOptions($container, bulkUpdateOptions);
        if (bulkUpdateOptions.tc_uri !== undefined && Object.keys(bulkUpdateOptions.ao_uris).length > 0 && bulkUpdateOptions.load_uri.length > 0) {
          $container.find('.alert').remove();
          updateBulkUpdates($container, bulkUpdateOptions.load_uri, bulkUpdateOptions.ao_uris, bulkUpdateOptions.tc_uri);
        }
        else {
          bulkUpdatesAlert($container, "warning");
        }
      });
    
    // trigger a resize so the modal resizes to fit the container size
    $(window).trigger("resize");
  };
  
});
