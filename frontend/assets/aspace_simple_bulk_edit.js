$(function() {
  
   if (typeof CURRENT_REPO_URI == "undefined") {
    return;
  }
  
  // setup the toolbar button and actions
  var simpleBulkEditBtnArr = {
    label: 'Simple Bulk Edit <span class="caret"></span>',
    cssClasses: 'btn-default dropdown-toggle simple-bulk-edit',
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
        // hide other edit options, including reorder since that can conflict
        $(this).closest('.btn-group').siblings().toggle();

        // hide other buttons
        if ($(tree.large_tree.elt).hasClass('drag-enabled')) {
          $('.btn:not(.simple-bulk-edit)',toolbarRenderer.container).hide();
        } else {
          console.log('foo');
          $('.btn:not(.simple-bulk-edit)',toolbarRenderer.container).show();
          $('.cut-selection,.paste-selection,.move-node', toolbarRenderer.container).hide();
          $(btn).blur();
        }
        
        // prevent click on tree if enabled
        $(tree.large_tree.elt).on('click', 'a.record-title', function(e){
          if ($(tree.large_tree.elt).hasClass('drag-enabled')) {
            e.preventDefault();
          }
          else {}
        });
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
    onFormChanged: function(btn, form, tree, toolbarRenderer) {
      $(btn).removeClass('disabled');
      if ($(tree.large_tree.elt).is('.drag-enabled')) {
        tree.ajax_tree.blockout_form();
      }
    },
    onFormLoaded: function(btn, form, tree, toolbarRenderer) {
      $(btn).removeClass('disabled');
      if ($(tree.large_tree.elt).is('.drag-enabled')) {
        tree.ajax_tree.blockout_form();
      }
    },
    onToolbarRendered: function(btn, toolbarRenderer) {
        $(btn).addClass('disabled');
        $(btn).closest('#tree-container').removeClass('drag-enabled');
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
  
  // get global top container uri
  var findGlobalTcUri = function($container) {
    return $container.find('#bulkUpdateContainerTypeahead').find('input[name="archival_record_children[children][0][instances][0][sub_container][top_container][ref]"]').val();
  };
  
  // get global tc type
  var findGlobalTcType = function($container) {
    return $container.find('#bulkUpdateContainerTypeahead').find('#aspace_simple_bulk_edit_global_instance_type_select option:selected').val();
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
  
  // get the ao tc type
  // if the local type is not filled, get the global type
  var findAoInstanceType = function($container, el) {
    ao_instance_type = el.parent().siblings('.aspace-simple-bulk-edit-summary-new-container').find('select[id^="aspace_simple_bulk_edit_instance_type"] option:selected').val();
    
    if (ao_instance_type == 'none'){
      if ($container.find('#aspace-simple-bulk-edit-use-global-tc').is(':checked')) {
        ao_instance_type = findGlobalTcType($container);
      }
      else {
        ao_instance_type = "none";
      }
    }
    
    console.log(ao_instance_type);

      
    return ao_instance_type;
  };
  
  // update the options - ao uris, tc uri, load uri
  var updateSimpleBulkEditsOptions = function($container) {
    var simpleBulkEditsOptions = {};
    simpleBulkEditsOptions.load_uri = $('#aspace_simple_bulk_edit_form').attr('action');
    simpleBulkEditsOptions.aos = findAoData($container);
    
    return simpleBulkEditsOptions;
  };
  
  // find the ao uris
  var findAoData = function($container) {
    aos = [];
    $container.find('input[name^="uri_"]').each(function() {
      ao = {
        uri: $(this).val(),
        title: $(this).parent().siblings('.aspace-simple-bulk-edit-summary-title').children('input').val(),
        tc_uri: findAoTcUri($container, $(this)),
        child_indicator: $(this).parent().siblings('.aspace-simple-bulk-edit-summary-child-indicator').find('.aspace-simple-bulk-edit-child-indicator').find('input').val(),
        child_type: $(this).parent().siblings('.aspace-simple-bulk-edit-summary-child-indicator').find('select option:selected').val(),
        date_type: $(this).parent().siblings('.aspace-simple-bulk-edit-summary-date').find('select option:selected').val(),
        date_begin: $(this).parent().siblings('.aspace-simple-bulk-edit-summary-date').find('.aspace-simple-bulk-edit-date-begin').find('input').val(),
        date_end: $(this).parent().siblings('.aspace-simple-bulk-edit-summary-date').find('.aspace-simple-bulk-edit-date-end').find('input').val(),
        date_expression: $(this).parent().siblings('.aspace-simple-bulk-edit-summary-date').find('.aspace-simple-bulk-edit-date-expression').find('textarea').val(),
        instance_type: findAoInstanceType($container, $(this)),
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
      $container.find('.aspace-simple-bulk-edit-child-indicator').each(function(index, v) {
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
      $container.find('.input-group.date').datepicker({
        format: "yyyy-mm-dd"
      });
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
        if (Object.keys(json).length > 0) {
          if (json.issues.length > 0) {
            $container.find('.modal-body').prepend('<div class="alert alert-warning alert-dismissible fade in" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button><p>' + json.issues + '</p></div>');
          }
          else {
            simpleBulkEditsAlert($container, "success");
          }
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
    $container.find('.modal-body').animate({ scrollTop: 0 }, 'slow');
  };
  
  var simpleBulkEditsTypeWarn = function(el, type, message) {
    if (el.children('option:selected').val() == "none") {
      var type_warn = AS.renderTemplate("template_aspace_simple_bulk_edit_type_warn", {
        type: type,
        message: message,
      });
      el.closest('div').append(type_warn);
    }
    else {
      el.closest('div').find('.aspace-simple-bulk-edit-type-warn').remove();
    }
    
    el.closest('.aspace-simple-bulk-edit-summary-child-indicator').find('.aspace-simple-bulk-edit-indicator-warn').remove();
    
    if (!el.parent('.aspace-simple-bulk-edit-child-type').siblings('.aspace-simple-bulk-edit-child-indicator').find('input').val()) {
       var indicator_warn = AS.renderTemplate("template_aspace_simple_bulk_edit_no_indicator_warn");
       el.parent('.aspace-simple-bulk-edit-child-type').siblings('.aspace-simple-bulk-edit-child-indicator').append(indicator_warn);
     }
  };
  
  // alerts if things aren't ready or go wrong
  var simpleBulkEditsAlert = function($container, alert_type) {
    
    var alert_template = AS.renderTemplate("template_aspace_simple_bulk_edit_alert", {
        alert_type: alert_type,
      });
    if ($container.find('div.alert').length > 0) {
      $container.find('div.alert').replaceWith(alert_template);
    }
    else $container.find('.modal-body').prepend(alert_template);
  
  };
  
  var validDate = function(str) {
    var m = str.split("-").toString();
    return (m) ? new Date(m) : null;
  };
  
  // validate each entry
  // Rules
  // 1. the title must not be empty
  // 2. if the use global tc is checked, then the global tc uri must have a value
  // 3. we must have a valid load_uri
  // 4. dates must be valid and have the correct properties
  // 5. if a chil type is selected, we must have an indicator
  var validate = function($container, options) {
    var valid = true;
    
    // check the load_uri
    if (options.load_uri.length < 1) {
      valid = false;
    }
    
    // check each ao data set - specifically the title and dates
    // aos are structured like
    // {load_uri: LOAD_URI,
    // aos: {{URI1 => {title => TITLE, tc_uri => TC_URI, child_indicator => CHILD_IND, date_type => date_type, date_expression => date_expression, date_begin => date_begin ...}, URI2 => {}}}
    $(options.aos).each(function(k,v) {
      
      // titles
      if (v.title.replace(/\s+/g,"").length < 1) {
        $container.find('tr[data-uri="'+v.uri+'"] .aspace-simple-bulk-edit-summary-title input').addClass('bg-danger');
        valid = false;
      }

      // dates
      if (v.date_type != "none") {
        // begin and end dates must be of form YYYY, YYYY-MM or YYYY-MM-DD
        if (v.date_begin.length > 0) {
          if (!validDate(v.date_begin)) {
            valid = false;
            $container.find('tr[data-uri="'+v.uri+'"] .aspace-simple-bulk-edit-summary-date .aspace-simple-bulk-edit-summary-date-begin').addClass('bg-danger');
          }
        }
        
        if (v.date_end.length > 0) {
          if (!validDate(v.date_end)) {
            valid = false;
            $container.find('tr[data-uri="'+v.uri+'"] .aspace-simple-bulk-edit-summary-date .aspace-simple-bulk-edit-summary-date-end').addClass('bg-danger');
          }
        }
        
        // all dates must have an expression or a begin date
        if (v.date_expression.replace(/\s+/g,"").length == 0 && v.date_begin.length == 0) {
          valid = false;
          $container.find('tr[data-uri="'+v.uri+'"] .aspace-simple-bulk-edit-summary-date').addClass('bg-danger');
        }
        
        // begin date must be before end date
        if (v.date_begin.length > 0 && v.date_end.length > 0) {
          var begin = new Date(v.date_begin.split("-").toString());
          var end = new Date(v.date_end.split("-").toString());
          if (begin > end) {
            valid = false;
            $container.find('tr[data-uri="'+v.uri+'"] .aspace-simple-bulk-edit-summary-date').addClass('bg-danger');
          }
        }
      }
      
      // instance child types
      if (v.child_type != "none") {
        if (v.child_indicator.length == 0) {
          valid = false;
          $container.find('tr[data-uri="'+v.uri+'"] .aspace-simple-bulk-edit-summary-child-indicator').addClass('bg-danger');
        }
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
      $container.find('.aspace-simple-bulk-edit-summary-title input, .aspace-simple-bulk-edit-summary-date').removeClass('bg-danger');
      $container.find('.aspace-simple-bulk-edit-summary-child-indicator').removeClass('bg-danger');
    }
    
    return valid;
  };
  
  // events in the modal - the good stuff
  var bindSummaryEvents = function($container) {
  
    $container.
      // dates
      on('change', ".aspace-simple-bulk-edit-date-type select", function(event) {
        event.preventDefault();
        event.stopPropagation();

        switch ($(this).val()) {
          case "none" :
            $(this).closest('td').find('.aspace-simple-bulk-edit-date-expression').hide();
            $(this).closest('td').find('.aspace-simple-bulk-edit-date-begin').hide();
            $(this).closest('td').find('.aspace-simple-bulk-edit-date-end').hide();
            break;
          case "single" :
            $(this).closest('td').find('.aspace-simple-bulk-edit-date-expression').show();
            $(this).closest('td').find('.aspace-simple-bulk-edit-date-begin').show();
            $(this).closest('td').find('.aspace-simple-bulk-edit-date-end').hide();
            break;
          default :
            $(this).closest('td').find('.aspace-simple-bulk-edit-date-expression').show();
            $(this).closest('td').find('.aspace-simple-bulk-edit-date-begin').show();
            $(this).closest('td').find('.aspace-simple-bulk-edit-date-end').show();
            break;
        }
      }).
      // child type
      on('change', '.aspace-simple-bulk-edit-child-type select', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        simpleBulkEditsTypeWarn($(this), 'child', 'child type and indicator');
      }).
      // child indicator
      on('blur', '.aspace-simple-bulk-edit-child-indicator input', function(event) {
        event.preventDefault();
        event.stopPropagation();

        // if there is a value we're good
        if ($(this).val().length > 0) {
          $(this).siblings('.aspace-simple-bulk-edit-indicator-warn').remove();
        }
        // if not pop up the warning
        if ($(this).val().length === 0 && $(this).closest('.aspace-simple-bulk-edit-summary-child-indicator').find('select option:selected').val() != "none") {
          simpleBulkEditsTypeWarn($(this).closest('.aspace-simple-bulk-edit-summary-child-indicator').find('select'), 'child','child type and instance');
        }
      }).
      // date type
      on('change', '.aspace-simple-bulk-edit-date-type select', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        simpleBulkEditsTypeWarn($(this), 'date', 'date');
      }).
      // instance type
      on('change', '.aspace-simple-bulk-edit-instance-type select', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        simpleBulkEditsTypeWarn($(this), 'instance', 'instance');
      }).
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
      // close
      on('click', '.aspace_simple_bulk_edits_close', function(event) {
        event.preventDefault();
        event.stopPropagation();
        $container.modal('toggle');
        $container.parent().find('#tree-container').removeClass('drag-enabled');
        window.location.reload();
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
