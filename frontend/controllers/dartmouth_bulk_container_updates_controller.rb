require 'aspace_logger'

class DartmouthBulkContainerUpdatesController < ApplicationController
    
  set_access_control  "update_resource_record" => [:update, :summary]

  def update
    
    ao_uris = ASUtils.as_array(params[:uri])
    tc_uri = ASUtils.as_array(params[:tc_uri])
    child_ind_start = params[:child_ind_start] ? ASUtils.as_array(params[:child_ind_start]) : nil
    
    #ao_uris.each_with_index do |uri, index|
      #ao_id = JSONModel.parse_reference(uri)[:id]
      #repo_id = JSONModel.parse_reference(uri)[:repository]
      #indicator_2 = child_ind_start.nil? ? nil : (index + child_ind_start).to_s
      # update_ao(ao_id, repo_id, tc_uri, indicator_2)
    #end
    response = JSONModel::HTTP.post_form("/plugins/dartmouth_bulk_container_update/repositories/#{session[:repo_id]}/update", "uri[]" => ao_uris,"tc_uri" => tc_uri, "child_ind_start" => child_ind_start )
    render :json => ASUtils.json_parse(response.body), :status => response.code
  end
  
  def summary
        
    uris = ASUtils.as_array(params[:uri])

    if uris.empty?
      @bulk_instance_items = []
    else
      response = JSONModel::HTTP.post_form("/plugins/dartmouth_bulk_container_update/repositories/#{session[:repo_id]}/summary", "uri[]" => uris)
      @dartmouth_bulk_container_update_items = ASUtils.json_parse(response.body)
    end
    
    render_aspace_partial :partial => "dartmouth_bulk_container_update/summary"
    
  end
  
  # all following this needs to be in the backend

end
