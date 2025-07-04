class SimpleBulkEdit {

  constructor(repoUri) {
    this.repoUri = repoUri;
  } 

  init() {
    const self = this;
    this.simpleBulkEditBtnArr = {
      label: 'Simple Bulk Edit <span class="caret"></span>',
      cssClasses: 'btn-default dropdown-toggle simple-bulk-edit',
      groupClasses: 'dropdown',
      onRender: function(btn, node, tree, toolbarRenderer) {
        const $options = $('<ul>').addClass('dropdown-menu ');
        const $liEnable = $('<li>');
        $liEnable.append($('<a>').attr('href', 'javascript:void(0);').
                            addClass('simple-bulk-edit-enable dropdown-item').
                            text('Enable'));
        $options.append($liEnable);
        const $liUpdate = $('<li>');
        $liUpdate.append($('<a>').attr('href', 'javascript:void(0);').
                            addClass('simple-bulk-edit-open dropdown-item').
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
          self.setupSimpleBulkEditsEvents();
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
    };

    if (typeof(TreeToolbarConfiguration) !== 'undefined') {
      const res = TreeToolbarConfiguration["resource"];
      const arch = TreeToolbarConfiguration["archival_object"];
      TreeToolbarConfiguration["resource"] = [].concat(res).concat([this.simpleBulkEditBtnArr]);
      TreeToolbarConfiguration["archival_object"] = [].concat(arch).concat([this.simpleBulkEditBtnArr]);
    }
  }
  
  
  // setup and render the modal
  setupSimpleBulkEditsEvents() {
    if (!$('#tree-container').hasClass('drag-enabled')) {
      alert("Please select 'Enable' to simple bulk edit.");
    }
    else {
      const data = this.urisToUpdate();
      const $modal = AS.openCustomModal("quickModal",
        AS.renderTemplate("template_aspace_simple_bulk_edit_dialog_title"),
        AS.renderTemplate("modal_quick_template", {
          message: AS.renderTemplate("template_aspace_simple_bulk_edit_dialog_contents", {
            selected: data,
          })
        }),
        "full");
  
      if ($modal.has("#bulkUpdatePane")) {
        this.loadSimpleBulkEdits($("#bulkUpdatePane"),data);
      }
  
      $modal.find(".modal-footer").replaceWith(AS.renderTemplate("template_aspace_simple_bulk_edit_dialog_footer"));
  
      this.bindSummaryEvents($modal);
    }
  }
  
  // get the uris to update
  urisToUpdate() {
    const self = this;
    const uris = [];
    const $treeContainer = $('#tree-container');
    let itemsToUpdate = $treeContainer.find('.multiselected-row');
    itemsToUpdate = itemsToUpdate.sort(function(a, b){
      return ($(b).find('.drag-annotation').text()) < ($(a).find('.drag-annotation').text()) ? 1 : -1;
    });
    itemsToUpdate.each(function() {
      uris.push(`${self.repoUri}/archival_objects/${$(this).attr('id').split("_").pop()}`);
    });
    return uris;
  }
  
  // get the resource uri
  getResourceUri() {
    return `${this.repoUri}/resources/${$('#tree-container').find('tr.root-row').attr('id').split("_").pop()}`;
  };
  
  // get global top container uri
  findGlobalTcUri($container) {
    return $container.find('#bulkUpdateContainerTypeahead').find('input[name="archival_record_children[children][0][instances][0][sub_container][top_container][ref]"]').val();
  };
  
  // get global tc type
  findGlobalTcType($container) {
    return $container.find('#bulkUpdateContainerTypeahead').find('#aspace_simple_bulk_edit_global_instance_type_select option:selected').val();
  };
  
  // get the ao tc uri
  // if the uri for that ao is not filled, default to the global tc
  findAoTcUri($container, aoId) {
    const currentAoTcUri = $container.find(`div[data-ao-inst-ref="${aoId}"]`).text();
    let newAoTcUri = $container.find(`input[data-ao-inst="${aoId}"]`).siblings('ul.token-input-list').children('li.token-input-token').find('input').last().val();

    if (typeof newAoTcUri === 'undefined'){
      if ($container.find('#aspace-simple-bulk-edit-use-global-tc').is(':checked')) {
        newAoTcUri = findGlobalTcUri($container);
      }
      else {
        newAoTcUri = "";
      }
    }

    if (typeof currentAoTcUri !== 'undefined') {
      if (newAoTcUri === "") {
        newAoTcUri = currentAoTcUri;
      }
    }

    return newAoTcUri;
  };
  
  // get the ao tc type
  // if the local type is not filled, get the global type
  findAoInstanceType($container, aoId) {
    let aoInstanceType = $container.find(`select[data-ao-inst-type="${aoId}"] option:selected`).val();
    
    if (aoInstanceType == 'none'){
      if ($container.find('#aspace-simple-bulk-edit-use-global-tc').is(':checked')) {
        aoInstanceType = this.findGlobalTcType($container);
      }
      else {
        aoInstanceType = "none";
      }
    }
    
    return aoInstanceType;
  };
  
  assembleExtents($container, aoId) {
    const extents = [];

    const extentsDivs = $container.find(`.aspace-simple-bulk-edit-summary-extent-${aoId}`).not('.extent-type-new');
    extentsDivs.each(function(idx, extDiv) {
      const extent = {
        extent_type: $(extDiv).find(`select[data-ao-extent-type="${aoId}"] option:selected`).val(),
        number: $(extDiv).find(`input[data-ao-extent-number="${aoId}"]`).val(),
        portion: $(extDiv).find(`select[data-ao-extent-portion="${aoId}"] option:selected`).val(),
        container_summary: $(extDiv).find(`textarea[data-ao-extent-container-summary="${aoId}"]`).val(),
        physical_details: $(extDiv).find(`input[data-ao-extent-physical-details="${aoId}"]`).val(),
        dimensions: $(extDiv).find(`input[data-ao-extent-dimensions="${aoId}"]`).val(),
      }
      extents.push(extent);
    });

    return extents;
  }

  assembleDates($container, aoId) {
    const dates = [];

    const datesDivs = $container.find(`.aspace-simple-bulk-edit-summary-date-${aoId}`).not('.date-type-new')
    datesDivs.each(function(idx, dateDiv) {
      const date = {};
      date.date_type = $(dateDiv).find(`select[data-ao-date-type="${aoId}"] option:selected`).val();
      date.label = $(dateDiv).find(`select[data-ao-date-label="${aoId}"] option:selected`).val();
      date.begin = $(dateDiv).find(`input[data-ao-date-begin="${aoId}"]`).val();
      date.end = $(dateDiv).find(`input[data-ao-date-end="${aoId}"]`).val();
      date.expression = $(dateDiv).find(`textarea[data-ao-date-exp="${aoId}"]`).val();
      date.certainty = $(dateDiv).find(`input[data-ao-date-certainty="${aoId}"]`).val();
      date.era = $(dateDiv).find(`input[data-ao-date-era="${aoId}"]`).val();
      date.calendar = $(dateDiv).find(`input[data-ao-date-calendar="${aoId}"]`).val();
      dates.push(date);
    });

    return dates;
  }

  // find the ao uris
  findAoData($container) {
    const self = this;
    const aos = [];

    $container.find('input[name^="uri_"]').each(function() {
      const aoId = $(this).data("ao-id");
      const ao = {
        id: aoId,
        uri: $(this).val(),
        title: $container.find(`textarea[data-ao-title="${aoId}"]`).val(),
        tc_uri: self.findAoTcUri($container, aoId),
        child_indicator: $container.find(`input[data-ao-child-ind="${aoId}"]`).val(),
        child_type: $container.find(`select[data-ao-child-type="${aoId}"] option:selected`).val(),
        dates: self.assembleDates($container, aoId),
        extents: self.assembleExtents($container, aoId),
        instance_type: self.findAoInstanceType($container, aoId),
      };
      aos.push(ao);
    });

    return aos;
  };
  
  // fill the child indicators
  fillIndicators($container) {
    if (!isNaN($container.find('#child_ind_start').val())) {
      startIndicator = parseInt($container.find('#child_ind_start').val());
      // fill the indicators in order
      $container.find('.aspace-simple-bulk-edit-child-indicator').each(function(index, v) {
        const newIndicator = index + startIndicator;
        $(this).children('input').val(newIndicator);
      });
    }
    else {
      alert('Please enter a number to start from.');
    }
  };
  
  // load the updates into the modal pane
  loadSimpleBulkEdits($container, data, onComplete) {
    const self = this;
    const loadUrl = $container.data("load-url");
  
    if (typeof loadUrl === 'undefined') {
      return;
    }
    $.post(loadUrl, {uri: data}, function(html) {
      $container.html(html);
      $container.find(".linker:not(.initialised)").linker();
      $container.find('.input-group.date').datepicker({
        format: "yyyy-mm-dd"
      });
      self.bindSummaryEvents($container);
      
      if (onComplete) {
        onComplete();
      }
    });
  };

  // update the options - ao uris, tc uri, load uri
  updateSimpleBulkEditsOptions($container) {
    const simpleBulkEditsOptions = {};
    simpleBulkEditsOptions.loadUri = $('#aspace_simple_bulk_edit_form').attr('action');
    simpleBulkEditsOptions.aos = this.findAoData($container);
    
    return simpleBulkEditsOptions;
  };
  
  // do the updates
  updateSimpleBulkEdits($container, onComplete) {
    const self = this;
    const simpleBulkEditsOptions = this.updateSimpleBulkEditsOptions($container);

    if (this.validate($container, simpleBulkEditsOptions)) {
      $container.find('.alert').remove();

      $.post(simpleBulkEditsOptions.loadUri, {uri: JSON.stringify(simpleBulkEditsOptions.aos.reverse())}, function(json) {
        if (Object.keys(json).length > 0) {
          if (json.issues.length > 0) {
            $container.find('.modal-body').prepend(`<div class="alert alert-warning alert-dismissible fade in" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button><p>${json.issues}</p></div>`);
          }
          else {
            self.simpleBulkEditsAlert($container, "success");
          }
        }
        else self.simpleBulkEditsAlert($container, "danger");
        
        if (onComplete) {
          onComplete();
        }
      });
    }
    else {
      this.simpleBulkEditsAlert($container, "warning");
    }
    $container.find('.modal-body').animate({ scrollTop: 0 }, 'slow');
  }
  
  simpleBulkEditsTypeWarn(el, type, message) {
    if (el.children('option:selected').val() == "none") {
      const typeWarn = AS.renderTemplate("template_aspace_simple_bulk_edit_type_warn", {
        type: type,
        message: message,
      });
      el.closest('div').append(typeWarn);
    }
    else {
      el.closest('div').find('.aspace-simple-bulk-edit-type-warn').remove();
    }
    
    el.closest('.aspace-simple-bulk-edit-summary-child-indicator').find('.aspace-simple-bulk-edit-indicator-warn').remove();
    
    if (!el.parent('.aspace-simple-bulk-edit-child-type').siblings('.aspace-simple-bulk-edit-child-indicator').find('input').val()) {
       const indicatorWarn = AS.renderTemplate("template_aspace_simple_bulk_edit_no_indicator_warn");
       el.parent('.aspace-simple-bulk-edit-child-type').siblings('.aspace-simple-bulk-edit-child-indicator').append(indicatorWarn);
     }
  }
  
  // alerts if things aren't ready or go wrong
  simpleBulkEditsAlert($container, alertType) {
    const alertTemplate = AS.renderTemplate("template_aspace_simple_bulk_edit_alert", {
        alert_type: alertType,
      });
    if ($container.find('div.alert').length > 0) {
      $container.find('div.alert').replaceWith(alertTemplate);
    } else {
      $container.find('.modal-body').prepend(alertTemplate);
    }
  }
  
  validDate(str) {
    const m = str.split("-").toString();
    return (m) ? new Date(m) : null;
  }
  
  // validate each entry
  // Rules
  // 1. the title must not be empty
  // 2. if the use global tc is checked, then the global tc uri must have a value
  // 3. we must have a valid loadUri
  // 4. dates must be valid and have the correct properties
  // 5. if a chil type is selected, we must have an indicator
  validate($container, options) {
    const self = this;
    let valid = true;
    
    // check the loadUri
    if (options.loadUri.length < 1) {
      valid = false;
    }
    
    // check each ao data set - specifically the title and dates
    // aos are structured like
    // {loadUri: loadUri,
    // aos: {{URI1 => {title => TITLE, tc_uri => TC_URI, child_indicator => CHILD_IND, dates => [{date_type => date_type, date_expression => date_expression, date_begin => date_begin ...}], extents => [{}], URI2 => {}}}
    $(options.aos).each(function(k, v) {

      // titles
      if (v.title.replace(/\s+/g,"").length < 1) {
        $container.find(`textarea[data-ao-title="${v.id}"]`).addClass('bg-danger');
        valid = false;
      }

      const extDiv = $container.find(`.aspace-simple-bulk-edit-summary-extents-${v.id}`);
      if (v.extents.length === 0) {
        extDiv.removeClass('bg-danger');
      }
      v.extents.forEach((extent, idx) => {
        // extents - must have type, portion, and number
        if (extent.extent_type !== "none") {
          extDiv.removeClass('bg-danger');
          const extNumber = extDiv.find(`input[data-ao-extent-number="${v.id}"]`);
          if (extent.number.length == 0) {
            valid = false;
            extNumber.addClass('bg-danger');
          } else {
            extNumber.removeClass('bg-danger');
          }
          const extPortion =  extDiv.find(`select[data-ao-extent-portion="${v.id}"]`)
          if (extent.portion == "none") {
            valid = false;
            extPortion.addClass('bg-danger');
          } else {
            extPortion.removeClass('bg-danger');
          }
        } else {
          valid = false;
          extDiv.addClass('bg-danger');
        }
      });

      // dates
      const dateDiv = $container.find(`.aspace-simple-bulk-edit-summary-dates-${v.id}`);
      v.dates.forEach((date, idx) => {
        if (date.date_type != "none") {
          // begin and end dates must be of form YYYY, YYYY-MM or YYYY-MM-DD
          if (date.begin.length > 0) {
            if (!self.validDate(date.begin)) {
              valid = false;
              dateDiv.find(`input[data-ao-date-begin="${v.id}"]`).addClass('bg-danger');
            }
          }
          
          if (date.end.length > 0) {
            if (!self.validDate(date.end)) {
              valid = false;
              $dateDiv.find(`input[data-ao-date-end="${v.id}"]`).addClass('bg-danger');
            }
          }
          
          // all dates must have an expression or a begin date
          if (date.expression.replace(/\s+/g, "").length == 0 && date.begin.length == 0) {
            valid = false;
            dateDiv.addClass('bg-danger');
          }
          
          // begin date must be before end date
          if (date.begin.length > 0 && date.end.length > 0) {
            var begin = new Date(date.begin.split("-").toString());
            var end = new Date(date.end.split("-").toString());
            if (begin > end) {
              valid = false;
              dateDiv.addClass('bg-danger');
            }
          }
        }
      });

      // instance child types
      if (v.child_type != "none") {
        if (v.child_indicator.length == 0) {
          valid = false;
          $container.find(`tr[data-uri="${v.uri}"] .aspace-simple-bulk-edit-summary-child-indicator`).addClass('bg-danger');
        }
      }

      if (v.tc_uri == '' && $container.find('#aspace-simple-bulk-edit-use-global-tc').not(':checked')) {
        if (v.child_indicator.length > 0 || v.child_type != 'none' || v.instance_type != 'none') {
          valid = false
          if (v.child_indicator.length > 0 || v.child_type != 'none') {
            $container.find(`tr[data-uri="${v.uri}"] .aspace-simple-bulk-edit-summary-child-indicator`).addClass('bg-danger');
          }
          if (v.instance_type != 'none') {
            $container.find(`tr[data-uri="${v.uri}"] .aspace-simple-bulk-edit-summary-new-container`).addClass('bg-danger');
          }
        }

      }

      if (v.tc_uri !== '' && v.instance_type === 'none') {
        valid = false
        $container.find(`tr[data-uri="${v.uri}"] .aspace-simple-bulk-edit-summary-new-container`).addClass('bg-danger');
      }
    });
    
    // check the global tc_uri
    if ($container.find('#aspace-simple-bulk-edit-use-global-tc').is(':checked') && typeof findGlobalTcUri($container) === 'undefined') {
      $container.find('#aspace-simple-bulk-edit-use-global-tc').parent('label').addClass('bg-danger');
      valid = false;
    }

    // remove any validation warnings
    if (valid) {
      $container.find('.bg-danger').removeClass('bg-danger');
    }
    
    return valid;
  }

  initDatePicker() {
    $.fn.combobox.defaults.template =
      '<div class="combobox-container input-group"><input type="hidden" /><input type="text" autocomplete="off"/><span class="input-group-btn btn dropdown-toggle" data-dropdown="dropdown"><span class="caret"/><span class="combobox-clear"><span class="icon-remove"></span></span></span></div>';
    $('.date-field:not(.initialised):not(.date-template)', '#aspace_simple_bulk_edit_form').each(function () {
      const $dateInput = $(this);

      if ($dateInput.parent().is('.input-group')) {
        $dateInput.parent().addClass('date');
      } else {
        $dateInput.wrap("<div class='input-group date'></div>");
      }

      $dateInput.addClass('initialised');

      // ANW-170, ANW-490: Opt-in to datepicker
      const $datepickerToggle = $(`
        <div class="input-group-append">
          <button
            class="btn btn-default"
            type="button"
            title="${$(this).data('label')}"
          >
          <span class="material-symbols-outlined">
          calendar_today
          </span>
          </button>
        </div>
      `);

      $dateInput.after($datepickerToggle);

      let enableDatepicker = false;

      $datepickerToggle.on('click', function () {
        enableDatepicker = !enableDatepicker;
        if (enableDatepicker) {
          $(this).addClass('datepicker-enabled');
          $dateInput.datepicker($dateInput.data());
          $dateInput.trigger('focus').trigger('select');
        } else {
          $(this).removeClass('datepicker-enabled');
          $dateInput.datepicker('destroy');
        }
      });
    });
  }

  addElement(el, type) {
    const lastType = el.parent().children('div:visible').last();
    const nextIdx = lastType.length > 0 ? lastType.data(`${type}-index`) + 1 : 0;
    const template = $(`#simple-bulk-edit-${type}s-template`).clone();
    const replaceKey = `_${type}_index_`;

    if (lastType.length > 0) {
      lastType.
        after(
          template.html()
          .replaceAll(replaceKey, nextIdx)
          .replaceAll(` ${type}-type-new`, '')
          .replaceAll(` ${type}-template`, '')
        );    
    } else {
      el
        .before(
          template.html()
          .replaceAll(replaceKey, nextIdx)
          .replaceAll(` ${type}-type-new`, '')
          .replaceAll(`${type}-template`, '')
        );
    }
  }

  // remove an element
  removeElement(el) {
    el.parent().remove();
  }

  addRepeatElement(type) {
    const lastType = $(`[class^="aspace-simple-bulk-edit-summary-${type}s-"]`).children('div:visible').last();
    const nextIdx = lastType.length > 0 ? lastType.data(`${type}-index`) + 1 : 0;
    const template = $(`#simple-bulk-edit-${type}s-template`).clone();
    const replaceKey = `_${type}_index_`;

    if (lastType.length > 0) {
      lastType.
        after(
          template.html()
          .replaceAll(replaceKey, nextIdx)
          .replaceAll(` ${type}-type-new`, '')
          .replaceAll(`${type}-template`, '')
        );
    } else {
      $(`[class^="aspace-simple-bulk-edit-summary-${type}s-"]`)
        .append(
          template.html()
          .replaceAll(replaceKey, nextIdx)
          .replaceAll(` ${type}-type-new`, '')
          .replaceAll(`${type}-template`, '')
        );
    }
  }
  
  // events in the modal - the good stuff
  bindSummaryEvents($container) {
    const self = this;

    this.initDatePicker();
    $container.
      // extent type
      on('change', '.aspace-simple-bulk-edit-extent-type select', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        self.simpleBulkEditsTypeWarn($(this), 'extent', 'extent type');
      }).
      on('click', '.add-extents', function(event) {
        event.preventDefault();
        event.stopPropagation();

        self.addRepeatElement('extent');
      }).
      on('click', '.add-dates', function(event) {
        event.preventDefault();
        event.stopPropagation();

        self.addRepeatElement('date');
        self.initDatePicker();
      }).
      on('click', '.add-single-date', function(event) {
        event.preventDefault();
        event.stopPropagation();

        self.addElement($(this), 'date');
        self.initDatePicker();
      }).
      on('click', '.add-single-extent', function(event) {
        event.preventDefault();
        event.stopPropagation();

        self.addElement($(this), 'extent');
      }).
      on('click', '.remove-extent, .remove-date', function(event) {
        event.preventDefault();
        event.stopPropagation();

        self.removeElement($(this));
      }).
      // child type
      on('change', '.aspace-simple-bulk-edit-child-type select', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        self.simpleBulkEditsTypeWarn($(this), 'child', 'child type and indicator');
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
          self.simpleBulkEditsTypeWarn($(this).closest('.aspace-simple-bulk-edit-summary-child-indicator').find('select'), 'child','child type and instance');
        }
      }).
      // child fill
      on('click', '#child-fill-toggle', function(event){
        event.preventDefault();
        event.stopPropagation();
        $(this).toggleClass('open');
        $container.find('#child-ind-fill').toggle();
      }).
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
      // date type
      on('change', '.aspace-simple-bulk-edit-date-type select', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        self.simpleBulkEditsTypeWarn($(this), 'date', 'date');
      }).
      // global tc
      on('click', '#global-tc-toggle', function(event){
        event.preventDefault();
        event.stopPropagation();
        $(this).toggleClass('open');
        $container.find('#bulkUpdateContainerTypeahead').toggle();
      }).
      // global tc extra explanation
      on('click', '#global-tc-explain-toggle', function(event){
        event.preventDefault();
        event.stopPropagation();
        $(this).toggleClass('open');
        $container.find('#global-tc-explain').toggle();
      }).
      // instance type
      on('change', '.aspace-simple-bulk-edit-instance-type select', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        self.simpleBulkEditsTypeWarn($(this), 'instance', 'instance');
      }).
      // remove an ao from the list
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
        self.fillIndicators($container);
      }).
      // close
      on('click', '.aspace_simple_bulk_edits_close, .modal-header .close', function(event) {
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
        self.updateSimpleBulkEdits($container);
      });
    
    // trigger a resize so the modal resizes to fit the container size
    $(window).trigger("resize");
  }
}
