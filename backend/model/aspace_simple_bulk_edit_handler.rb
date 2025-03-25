require 'aspace_logger'
class AspaceSimpleBulkEditHandler
  
  include JSONModel
  
  attr_accessor :aspace_simple_bulk_edit_errors, :aspace_simple_bulk_edit_complete
  
  def initialize(ao, repo)
    @aspace_simple_bulk_edit_complete = []
    @aspace_simple_bulk_edit_errors = []
    @repo_id = repo
    start_update(ao)
  end
  
  def start_update(ao)
    
    @type_2 = ao['child_type'].empty? ? "none" : ao['child_type']
    @indicator_2 = ao['child_indicator'].empty? ? nil : ao['child_indicator']
    
    @instance_type = ao['instance_type'].empty? ? "none" : ao['instance_type']
    @tc_uri = ao['tc_uri'].empty? ? "" : ao['tc_uri']
    
    ao_id = JSONModel.parse_reference(ao['uri'])[:id]
    title = ao['title'].nil? ? nil : ao['title']
    
    dates = []
    ao['dates'].each do |date|
      date['label'] = date['label'] unless date['label'].empty?
      date["date_type"] = date["date_type"] unless date["date_type"].empty?
      date["begin"] = date["begin"] unless date["begin"].empty?
      date["end"] = date["end"] unless date["end"].empty?
      date["expression"] = date["expression"] unless date["expression"].empty?
      date["era"] = date["era"] unless date["era"].empty?
      date["certainty"] = date["certainty"] unless date["certainty"].empty?
      date["calendar"] = date["calendar"] unless date["calendar"].empty?
      dates << date
    end

    extents = []
    ao['extents'].each do |ext|
      extent = {}
      extent['extent_type'] = ext['extent_type'] unless ext['extent_type'].empty?
      extent['number'] = ext['number'] unless ext['number'].empty?
      extent['container_summary'] = ext['container_summary'] unless ext['container_summary'].empty?
      extent['portion'] = ext['portion'] unless ext['portion'].empty?
      extent['physical_details'] = ext['physical_details'] unless ext['physical_details']
      extent['dimensions'] = ext['dimensions'] unless ext['dimensions']
      extents << extent unless extent.empty?
    end

    update_ao(ao_id, title, dates, extents)
    
    return @aspace_simple_bulk_edit_errors, @aspace_simple_bulk_edit_complete
    
  end
  
  def update_ao(id, title, dates, extents)

    RequestContext.open(:repo_id => @repo_id) do
      ao, ao_json = get_ao_object(id)
      
      # update the title if one exists
      unless title.nil?
        ao_json['title'] = title
      end
      
      # update the date
      unless dates.empty?
        update_dates_for_ao(ao_json, dates)
      end

      unless extents.empty?
        update_extents_for_ao(ao_json, extents)
      end
      
      # create or update the container instance
      update_container_instance(ao_json)

      # update the ao
      ao.update_from_json(JSONModel(:archival_object).from_hash(ao_json))
      @aspace_simple_bulk_edit_complete << id

      # update any descendants
      update_ao_descendants(id)
    end
    
  end
  
  def get_ao_object(id)
    ao = ArchivalObject.get_or_die(id)
    ao_json = URIResolver.resolve_references(ArchivalObject.to_jsonmodel(ao), ['repository'])
    
    return ao, ao_json
  end
  
  def update_ao_descendants(id)
    descendants = get_ao_descendants(id,[])
  
    if descendants.count > 0
      descendants.each do |item_uri|
        child_id = JSONModel.parse_reference(item_uri)[:id]
        # set the title to be nil so we don't update it for descendants
        update_ao(child_id, nil, nil)
      end
    end
  end

  def validate_extents(hash)
    errors = []

    fields = ["extent_type", "portion", "number"]

    if fields.all? {|field| !hash.has_key?(field) || hash[field].empty?}
      fields.each do |field|
        errors << [field, "you must provide an extent type, portion and number"]
      end
    end

    errors

  end

  def update_extents_for_ao(ao_json, extents)
    extents.each do |extent|
      extent['portion'] = extent['portion'].nil? ? 'whole' : extent['portion']
      extent_str = "(Extent: portion:#{extent['portion']}, number:#{extent['number']}, container_summary:#{extent['container_summary']}, extent_type:#{extent['extent_type']})"
      
      unless extent['extent_type'] == 'none'
        invalids = validate_extents(extent)
        unless (invalids.nil? || invalids.empty?)
          err_msg = ""
          invalids.each do |inv|
            err_msg << " #{inv[0]}: #{inv[1]}"
          end
          @aspace_simple_bulk_edit_errors << I18n.t("aspace_simple_bulk_edit.error.invalid_extent", :what => err_msg, :extent_str => date_str, :title => ao_json['title'])
          return nil
        end
      end

      # remove the extent if there is no type
      next if extent["extent_type"] == "none"

      # or update or create 
      ao_json["extents"] << JSONModel(:extent).new(extent).to_hash
    end
    
    ao_json
  end
  
  # see archivesspace/backend/app/lib/bulk_import/bulk_import_mixins.rb
  def update_dates_for_ao(ao_json, dates)
    date.each do |date|
    
      date["label"] = date['label'].nil? ? "creation" : date["label"]
      date_str = "(Date: type:#{date['date_type']}, label: #{date['label']}, begin: #{date['begin']}, end: #{date['end']}, expression: #{date['expression']})"
      
      # only check dates if we are actually updating or creating a new one
      unless new_date["date_type"] == "none"
        invalids = JSONModel::Validations.check_date(new_date)
        unless (invalids.nil? || invalids.empty?)
          err_msg = ""
          invalids.each do |inv|
            err_msg << " #{inv[0]}: #{inv[1]}"
          end
          @aspace_simple_bulk_edit_errors << I18n.t("aspace_simple_bulk_edit.error.invalid_date", :what => err_msg, :date_str => date_str, :title => ao_json['title'])
          return nil
        end
      end
      if date["type"] == "single" && !date["end"].nil?
        @aspace_simple_bulk_edit_errors << I18n.t("aspace_simple_bulk_edit.warn.single_date_end", :date_str => date_str, :title => ao_json['title'])
      end
      
      next if date['date_type'] == "none"

      # or update or create  
      ao_json["dates"] << JSONModel(:date).new(date).to_hash
    end
    
    ao_json
  end
  
  # see archivesspace/backend/app/lib/bulk_import/container_instance_handler.rb
  def update_container_instance(ao_json)
    
    inst = ao_json['instances'].find{ |i| i.has_key?("sub_container")}

    # create instance if there isn't one and a tc uri and intance type are supplied
    if (inst.nil? || inst.empty?) && !@tc_uri.empty? && @instance_type != "none" && !@instance_type.nil?
      inst = simple_bulk_edit_create_container_instance
      ao_json['instances'] << inst
      
    # otherwise update the existing container
    else
      # find the first container instance since that's what we are editing
      inst = ao_json['instances'].find{ |i| i.has_key?("sub_container")}
      
      # nothing to do
      return if inst.nil? || inst.empty?

      # remove it
      ao_json['instances'] = ao_json['instances'] - [inst]
 
      unless @instance_type == "none" || @instance_type.nil?
        
        # update the type
        inst['instance_type'] = @instance_type
        
        # update the tc if there is one
        unless @tc_uri.empty?
          inst['sub_container']['top_container']['ref'] = @tc_uri
        end
        
        # update child indicator if needed and add type if not present
        if @indicator_2.nil? || @type_2 == "none"
          inst['sub_container']['indicator_2'] = nil
          inst['sub_container']['type_2'] = nil
        else
          inst['sub_container']['indicator_2'] = @indicator_2
          inst['sub_container']['type_2'] = @type_2
        end
      
        # add it back in
        ao_json['instances'] << inst
      end
    end
    
    ao_json
  end

  # shorthand for creating a mixed materials, folder instance hash
  def simple_bulk_edit_create_container_instance
    instance = nil
    begin
      sc = {'top_container' => {'ref' => @tc_uri}, 'jsonmodeltype' => 'sub_container'}
      unless @indicator_2.nil? || @type_2 == "none"
        sc["type_2"] = @type_2
        sc["indicator_2"] = @indicator_2
      end
      instance = JSONModel(:instance).new._always_valid!
      instance.instance_type = @instance_type
      instance.sub_container = JSONModel(:sub_container).from_hash(sc)
    rescue Exception => e
      msg = e.message #+ "\n" + e.backtrace()[0]
      raise Exception.new(msg)
    end
    instance.to_hash
  end
  
  def get_ao_descendants(ao_id, descendants)
    if descendants.empty?
      descendants = []
    end
    
    ao = ArchivalObject.get_or_die(ao_id)
    grand_children = ao.children.map {|child| ArchivalObject.to_jsonmodel(child)}
    if not grand_children.empty?
      grand_children.each do |descendant|
        descendants.push(descendant["uri"])
        get_ao_descendants(descendant["uri"].split('/').last, descendants)
      end
    end

    descendants
  end

end
