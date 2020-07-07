require 'aspace_logger'

class DartmouthBulkContainerUpdatesController < ApplicationController
  
  set_access_control  "update_resource_record" => [:update, :summary]

  def update
    
    ao_uris = ASUtils.as_array(params[:uri])
    tc_uri = ASUtils.as_array(params[:tc_uri])
    child_ind_start = params[:child_ind_start] ? ASUtils.as_array(params[:child_ind_start]).to_i : nil
    ao_uris.each do |uri|
      ao_id = JSONModel.parse_reference(uri)[:id]
      repo_id = JSONModel.parse_reference(uri)[:repository]
      update_ao(ao_id, repo_id, tc_uri, child_ind_start)
    end
    
  end
  
  
  def summary
        
    uris = ASUtils.as_array(params[:uri])

    if uris.empty?
      @bulk_instance_items = []
    else
      response = JSONModel::HTTP.post_form("/plugins/dartmouth_bulk_container_update/repositories/#{session[:repo_id]}/get_aos", "uri[]" => uris)
      @dartmouth_bulk_container_update_items = ASUtils.json_parse(response.body)
    end
    
    render_aspace_partial :partial => "dartmouth_bulk_container_update/summary"
    
  end
  
  def update_ao(id, repo_id, new_tc_id, child_ind_start, index)
    
    RequestContext.open(:repo_id => repo_id) do
      ao, ao_json = get_ao_object(id)
      if ao_json['instances'].find{ |i| i.has_key?("sub_container")}.nil?
        # create instance
        indicator_2 = child_ind_start.nil? ? nil : index + child_ind_start
        create_container_instance("mixed_materials", new_tc_id, indicator_2)
      else
        # find the container instance (naively assume only one)
        inst = ao_json['instances'].find{ |i| i.has_key?("sub_container")}
        # remove it
        ao_json['instances'] = ao_json['instances'] - inst
        # update it
        inst['sub_container']['top_container']['ref'] = new_tc_id
        # update child indicator if needed
        unless child_ind_start.nil?
          inst['sub_container']['indicator_2'] = (index + child_ind_start).to_s
        end
        # add it back in
        ao_json['instances'] << inst
      end
      ao.update_from_json(JSONModel(:archival_object).from_hash(ao_json))
    end
    
  end
  
  def get_ao_object(id)
    ao = ArchivalObject.get_or_die(id)
    ao_json = URIResolver.resolve_references(ArchivalObject.to_jsonmodel(ao), ['repository'])
    
    return ao, ao_json
  end
  
  # shorthand for creating a mixed materials, folder instance
  def create_container_instance(instance_type = "mixed_materials", tc_uri, child_ind = nil)
    instance = nil
    begin
      sc = {'top_container' => {'ref' => tc_uri}, 'jsonmodeltype' => 'sub_container'}
      unless child_ind.nil?
        sc["type_2"] = "folder"
        sc["indicator_2"] = child_ind
      end
      instance = JSONModel(:instance).new._always_valid!
      instance.instance_type = @instance_types.value(instance_type)
      instance.sub_container = JSONModel(:sub_container).from_hash(sc)
    rescue Exception => e
      msg = e.message #+ "\n" + e.backtrace()[0]
      raise Exception.new(msg)
    end
    instance
  end

  
end