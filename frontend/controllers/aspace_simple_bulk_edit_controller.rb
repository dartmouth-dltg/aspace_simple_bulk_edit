require 'aspace_logger'

class AspaceSimpleBulkEditController < ApplicationController
    
  set_access_control  "update_resource_record" => [:update, :summary]

  def update
    
    ao_uris = ASUtils.as_array(params[:uri])
    tc_uri = ASUtils.as_array(params[:tc_uri])
    child_ind_start = ASUtils.as_array(params[:child_ind_start]).empty? ? nil : ASUtils.as_array(params[:child_ind_start])
    
    response = JSONModel::HTTP.post_form("/plugins/aspace_simple_bulk_edit/repositories/#{session[:repo_id]}/update", "uri[]" => ao_uris, "tc_uri" => tc_uri, "child_ind_start" => child_ind_start )
    render :json => ASUtils.json_parse(response.body), :status => response.code
  end
  
  def summary
        
    uris = ASUtils.as_array(params[:uri])

    if uris.empty?
      @bulk_instance_items = []
    else
      response = JSONModel::HTTP.post_form("/plugins/aspace_simple_bulk_edit/repositories/#{session[:repo_id]}/summary", "uri[]" => uris)
      @dartmouth_bulk_container_update_items = ASUtils.json_parse(response.body)
    end
    
    render_aspace_partial :partial => "aspace_simple_bulk_edit/summary"
    
  end
  
  # all following this needs to be in the backend

end
