require 'aspace_logger'

class AspaceSimpleBulkEditController < ApplicationController
    
  set_access_control  "update_resource_record" => [:update, :summary]

  def update
    
    ao_uris = ASUtils.as_array(params[:uri])
    response = JSONModel::HTTP.post_form("/plugins/aspace_simple_bulk_edit/repositories/#{session[:repo_id]}/update", "uri[]" => ao_uris)
    render :json => ASUtils.json_parse(response.body), :status => response.code
  end
  
  def summary
        
    uris = ASUtils.as_array(params[:uri])

    if uris.empty?
      @bulk_instance_items = []
    else
      response = JSONModel::HTTP.post_form("/plugins/aspace_simple_bulk_edit/repositories/#{session[:repo_id]}/summary", "uri[]" => uris)
      @dartmouth_bulk_container_update_items = ASUtils.json_parse(response.body)
      
      # get the date type enumeration values
      @date_types = JSONModel::HTTP.get_json("/config/enumerations/names/date_type")
      
      # get the instance types values
      @instance_types = JSONModel::HTTP.get_json("/config/enumerations/names/instance_instance_type")
      
      # get the chld type values
      @container_types = JSONModel::HTTP.get_json("/config/enumerations/names/container_type")
    end
    
    render_aspace_partial :partial => "aspace_simple_bulk_edit/summary"
    
  end

end
