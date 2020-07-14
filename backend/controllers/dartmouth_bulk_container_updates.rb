require 'aspace_logger'

class ArchivesSpaceService < Sinatra::Base
  
  include JSONModel
  
  Endpoint.post('/plugins/dartmouth_bulk_container_update/repositories/:repo_id/summary')
  .description("Return resolved JSON of the records to update")
  .params(["repo_id", :repo_id],
          ["uri", [String], "The uris of the records to update"])
  .permissions([:update_resource_record])
  .returns([200, "[(:dartmouth_bulk_container_update_item)]"]) \
  do
    bulk_updates = DartmouthBulkContainerUpdateItems.new(params[:uri])

    json_response(resolve_references(bulk_updates.dartmouth_bulk_container_update_items, ["archival_object","archival_object::_resolved::instances::sub_container::top_container"]))
  end
  
  Endpoint.post('/plugins/dartmouth_bulk_container_update/repositories/:repo_id/update')
  .description("Return resolved JSON of the records to update")
  .params(["repo_id", :repo_id],
          ["uri", [String], "The uris of the records to update"],
          ["tc_uri", String, "The uri of the top conatiner to link to"],
          ["child_ind_start", String, "The start of the child indicators"]
          )
  .permissions([:update_resource_record])
  .returns([200, :updated]) \
  do
    params[:uri].each do |uri_hash|
      ASUtils.json_parse(uri_hash).each_with_index do |(uri,title), index|
        ao_id = JSONModel.parse_reference(uri)[:id]
        repo_id = params[:repo_id]
        indicator_2 = params[:child_ind_start].empty? ? nil : (index + params[:child_ind_start].to_i).to_s
        update_ao(ao_id, title, repo_id, params[:tc_uri], indicator_2)
      end
    end
    
    json_response(params[:uri])
  end
  
  private
  
  def update_ao(id, title, repo_id, new_tc_id, indicator_2, inst = nil)

    RequestContext.open(:repo_id => repo_id) do
      ao, ao_json = get_ao_object(id)
      # update the title
      unless title.nil?
        ao['title'] = title
      end
      
      if ao_json['instances'].find{ |i| i.has_key?("sub_container")}.nil?
        if inst.nil?
          # create instance
          inst = dart_create_container_instance("mixed_materials", new_tc_id, indicator_2)
        end
      else
        # find the container instance (naively assume only one)
        inst = ao_json['instances'].find{ |i| i.has_key?("sub_container")}
        # remove it
        ao_json['instances'] = ao_json['instances'] - [inst]
        # update it
        inst['sub_container']['top_container']['ref'] = new_tc_id
        # update child indicator if needed and add type if not present
        unless indicator_2.nil?
          inst['sub_container']['indicator_2'] = indicator_2
          unless inst['sub_container']['type_2']
            inst['sub_container']['type_2'] = "folder"
          end
        end
      end
      # add it back in
      ao_json['instances'] << inst

      # update the ao
      ao.update_from_json(JSONModel(:archival_object).from_hash(ao_json))

      # update any descendants
      update_ao_descendants(id, repo_id, new_tc_id, indicator_2, inst)
    end
    
  end
  
  def get_ao_object(id)
    ao = ArchivalObject.get_or_die(id)
    ao_json = URIResolver.resolve_references(ArchivalObject.to_jsonmodel(ao), ['repository'])
    
    return ao, ao_json
  end
  
  def update_ao_descendants(id, repo_id, new_tc_id, indicator_2, inst)
    descendants = get_ao_descendants(id,[])
  
    if descendants.count > 0
      descendants.each do |item_uri|
        child_id = JSONModel.parse_reference(item_uri)[:id]
        # set the title to be nil so we don't update it for descendants
        update_ao(child_id, nil, repo_id, new_tc_id, indicator_2, inst)
      end
    end
  end
  
  # shorthand for creating a mixed materials, folder instance hash
  def dart_create_container_instance(instance_type, tc_uri, child_ind = nil)
    instance = nil
    begin
      sc = {'top_container' => {'ref' => tc_uri}, 'jsonmodeltype' => 'sub_container'}
      unless child_ind.nil?
        sc["type_2"] = "folder"
        sc["indicator_2"] = child_ind
      end
      instance = JSONModel(:instance).new._always_valid!
      instance.instance_type = instance_type
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