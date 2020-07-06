require 'aspace_logger'

class DartmouthBulkContainerUpdatesController < ApplicationController
  
  set_access_control  "update_resource_record" => [:update, :summary]

  def update
    
    ao_uris = ASUtils.as_array(params[:record_uris])
    logger.debug("AO_updates: #{ao_uris}")
    
  end
  
  
  def summary
    
    logger=Logger.new($stderr)
    
    uris = ASUtils.as_array(params[:uri])
    logger.debug("URIS: #{uris}")
    if uris.empty?
      @bulk_instance_items = []
    else
      response = JSONModel::HTTP.post_form("/plugins/dartmouth_bulk_container_update/repositories/#{session[:repo_id]}/get_aos", "uri[]" => uris)
      @dartmouth_bulk_container_update_items = ASUtils.json_parse(response.body)
    end
    
    logger.debug("AOS: #{@dartmouth_bulk_container_update_items}")
    render_aspace_partial :partial => "dartmouth_bulk_container_update/summary"
    
  end
  
end