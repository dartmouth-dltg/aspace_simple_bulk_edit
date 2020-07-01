require 'aspace_logger'

class InstanceBulkUpdateController < ApplicationController
  
  set_access_control  "update_resource_record" => [:update, :summary]

  def update
    
    ao_uris = ASUtils.as_array(params[:record_uris])
    logger.debug("AOs: #{ao_uris}")
    
  end
  
  
  def summary
    
  end
  
end